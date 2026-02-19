/**
 * ROCK SOLID Daily Signal Processor
 * 
 * Processes daily-signals.csv from shared Drive folder
 * - Creates companies if new
 * - Creates signal records
 * - Updates messaging hooks
 * - Queues new companies for Clay
 * - Reports everything to Craig
 * 
 * Required columns: company_name, website, signal_type, signal_tier, signal_date, title, source_url, messaging_hook
 */

const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '../.env.google' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SHARED_FOLDER_ID = '1HnJdC2OMNziNKrfkiqVg1t1GYagq6qdT';
const CLAY_WEBHOOK_URL = 'https://api.clay.com/v3/sources/webhook/pull-in-data-from-a-webhook-d4b4e7f3-b6d3-4cc9-8740-ec6e014c1d5c';
let CLAY_API_KEY;
try {
  CLAY_API_KEY = fs.readFileSync('secrets/clay-api-key.txt', 'utf-8').trim();
} catch (e) {
  console.log('⚠ Clay API key not found - will skip Clay push');
}

const REQUIRED_COLUMNS = ['company_name', 'website', 'signal_type', 'signal_tier', 'signal_date', 'title', 'source_url', 'messaging_hook'];

async function processDaily() {
  console.log('🚀 DAILY SIGNAL PROCESSOR\n');
  console.log('=' .repeat(50));
  
  // Setup Google Drive
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Find daily-signals.csv
  const { data: files } = await drive.files.list({
    q: `name = 'daily-signals.csv' and '${SHARED_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, modifiedTime)'
  });

  if (!files.files?.length) {
    console.log('❌ daily-signals.csv NOT FOUND in shared folder');
    console.log('\nTodd needs to create daily-signals.csv with his signals.');
    return { error: 'FILE_NOT_FOUND', summary: 'daily-signals.csv not found' };
  }

  const file = files.files[0];
  console.log(`📄 Found: ${file.name}`);
  console.log(`   Modified: ${new Date(file.modifiedTime).toLocaleString()}\n`);

  // Download content
  const { data: content } = await drive.files.get({
    fileId: file.id,
    alt: 'media'
  });

  // Parse CSV
  const lines = content.toString().split('\n').filter(l => l.trim());
  
  if (lines.length <= 1) {
    console.log('📭 File is empty (header only) - no signals to process');
    return { error: 'EMPTY_FILE', summary: 'No signals in file' };
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  
  // Validate required columns
  const missingCols = REQUIRED_COLUMNS.filter(c => !header.includes(c));
  if (missingCols.length > 0) {
    console.log('❌ Missing required columns:', missingCols.join(', '));
    return { error: 'MISSING_COLUMNS', summary: `Missing columns: ${missingCols.join(', ')}` };
  }

  const colIndex = {};
  header.forEach((col, i) => { colIndex[col] = i; });

  // Process each row
  const results = {
    signalsAdded: 0,
    companiesCreated: 0,
    companiesUpdated: 0,
    rowsRejected: 0,
    duplicatesSkipped: 0,
    clayQueued: [],
    details: []
  };

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (row.length < header.length) {
      results.rowsRejected++;
      results.details.push(`Row ${i + 1}: Incomplete row, skipped`);
      continue;
    }

    const companyName = row[colIndex['company_name']]?.trim();
    const website = row[colIndex['website']]?.trim();
    const signalType = row[colIndex['signal_type']]?.trim();
    const signalTier = parseInt(row[colIndex['signal_tier']]) || 3;
    const signalDate = row[colIndex['signal_date']]?.trim();
    const title = row[colIndex['title']]?.trim();
    const sourceUrl = row[colIndex['source_url']]?.trim();
    const messagingHook = row[colIndex['messaging_hook']]?.trim();

    // Validate required fields
    if (!companyName || !website || !signalType || !signalDate || !title || !sourceUrl) {
      results.rowsRejected++;
      results.details.push(`Row ${i + 1}: Missing required field(s) for "${companyName || 'unknown'}"`);
      continue;
    }

    // Generate slug
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fullWebsite = website.startsWith('http') ? website : `https://${website}`;

    // Find or create company
    let { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .eq('slug', slug)
      .single();

    let isNewCompany = false;
    
    if (!company) {
      // Try by name
      const { data: byName } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', companyName)
        .limit(1);
      
      company = byName?.[0];
    }

    if (!company) {
      // Create new company
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: slug,
          website: fullWebsite,
          messaging_hook: messagingHook
        })
        .select('id, name')
        .single();

      if (createError) {
        results.rowsRejected++;
        results.details.push(`Row ${i + 1}: Failed to create company "${companyName}": ${createError.message}`);
        continue;
      }

      company = newCompany;
      isNewCompany = true;
      results.companiesCreated++;
      results.clayQueued.push({ name: companyName, website: fullWebsite });
    } else {
      // Update existing company messaging hook
      if (messagingHook) {
        await supabase
          .from('companies')
          .update({ messaging_hook: messagingHook })
          .eq('id', company.id);
        results.companiesUpdated++;
      }
    }

    // Check for duplicate signal (same company + same date + same type)
    const { data: existingSignal } = await supabase
      .from('signals')
      .select('id')
      .eq('company_id', company.id)
      .eq('signal_type', signalType)
      .eq('signal_date', signalDate)
      .limit(1);

    if (existingSignal?.length > 0) {
      results.duplicatesSkipped++;
      results.details.push(`${companyName}: Duplicate signal skipped (${signalType} on ${signalDate})`);
      continue;
    }

    // Create signal record
    const { error: signalError } = await supabase
      .from('signals')
      .insert({
        company_id: company.id,
        signal_type: signalType,
        signal_tier: signalTier,
        signal_date: signalDate,
        title: title,
        source_url: sourceUrl,
        created_at: new Date().toISOString()
      });

    if (signalError) {
      results.rowsRejected++;
      results.details.push(`${companyName}: Failed to create signal: ${signalError.message}`);
      continue;
    }

    results.signalsAdded++;
    const status = isNewCompany ? 'NEW COMPANY + signal added' : 'signal added';
    results.details.push(`✓ ${companyName}: ${status} (${signalType})`);
  }

  // Push new companies to Clay
  if (CLAY_API_KEY && results.clayQueued.length > 0) {
    console.log('\n📤 Pushing new companies to Clay...');
    for (const c of results.clayQueued) {
      try {
        const res = await fetch(CLAY_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-clay-webhook-auth': CLAY_API_KEY
          },
          body: JSON.stringify({ 'Company Name': c.name, 'Website': c.website })
        });
        console.log(`   ${c.name}: ${res.ok ? '✓ pushed' : '✗ failed'}`);
      } catch (e) {
        console.log(`   ${c.name}: ✗ error`);
      }
    }
  }

  // Rename processed file
  const today = new Date().toISOString().split('T')[0];
  const newName = `daily-signals-processed-${today}.csv`;
  await drive.files.update({
    fileId: file.id,
    requestBody: { name: newName }
  });
  console.log(`\n📁 File renamed to: ${newName}`);

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Signals added:      ${results.signalsAdded}`);
  console.log(`Companies created:  ${results.companiesCreated}`);
  console.log(`Companies updated:  ${results.companiesUpdated}`);
  console.log(`Duplicates skipped: ${results.duplicatesSkipped}`);
  console.log(`Rows rejected:      ${results.rowsRejected}`);
  console.log(`Clay queue:         ${results.clayQueued.length}`);
  
  if (results.details.length > 0) {
    console.log('\n📝 DETAILS:');
    results.details.forEach(d => console.log(`   ${d}`));
  }

  return results;
}

// Parse CSV row handling quoted values
function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

processDaily()
  .then(r => {
    if (r.error) {
      process.exit(1);
    }
  })
  .catch(e => {
    console.error('❌ Fatal error:', e.message);
    process.exit(1);
  });
