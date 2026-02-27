/**
 * Import Clay enrichment data from Google Sheet
 * OPTIMIZED: Only processes companies that need enrichment
 * 
 * Logic:
 * 1. Get companies where last_enriched_at is NULL (never enriched)
 * 2. Build lookup by slug/name
 * 3. Scan Clay sheet for matches
 * 4. Update only those companies
 */
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '../.env.google' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

function normalizeEmployeeRange(range, count) {
  const countNum = parseInt(count);
  if (countNum) {
    if (countNum <= 10) return '1-10';
    if (countNum <= 50) return '11-50';
    if (countNum <= 200) return '51-200';
    if (countNum <= 500) return '201-500';
    if (countNum <= 1000) return '501-1000';
    if (countNum <= 5000) return '1001-5000';
    if (countNum <= 10000) return '5001-10000';
    return '10000+';
  }
  return range || null;
}

function slugify(str) {
  return str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '';
}

async function importClayEnrichment() {
  console.log('📊 Clay Enrichment Import (Optimized)\n');

  // STEP 1: Get companies that need enrichment
  console.log('Step 1: Finding companies that need enrichment...');
  const { data: companies, error: dbError } = await supabase
    .from('companies')
    .select('id, name, slug, website')
    .is('last_enriched_at', null);

  if (dbError) {
    console.error('❌ Database error:', dbError.message);
    return;
  }

  if (!companies?.length) {
    console.log('✅ All companies already enriched. Nothing to do.');
    return;
  }

  console.log(`Found ${companies.length} companies needing enrichment\n`);

  // STEP 2: Build lookup maps
  const bySlug = new Map();
  const byName = new Map();
  const byFirstWord = new Map();

  for (const c of companies) {
    const slug = slugify(c.name);
    bySlug.set(slug, c);
    bySlug.set(c.slug, c);
    byName.set(c.name.toLowerCase(), c);
    
    const firstWord = c.name.split(/[\s\/\-]+/)[0].toLowerCase();
    if (firstWord.length >= 3) {
      if (!byFirstWord.has(firstWord)) byFirstWord.set(firstWord, []);
      byFirstWord.get(firstWord).push(c);
    }
  }

  // STEP 3: Find Clay sheet
  console.log('Step 2: Reading Clay sheet...');
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const { data: files } = await drive.files.list({
    q: "name = 'Clay-Enrichment-Output' and mimeType = 'application/vnd.google-apps.spreadsheet'",
    fields: 'files(id, name)',
  });

  if (!files.files?.length) {
    console.log('❌ Sheet "Clay-Enrichment-Output" not found');
    return;
  }

  const sheetId = files.files[0].id;
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const { data: sheetData } = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:O',
  });

  const rows = sheetData.values || [];
  if (rows.length <= 1) {
    console.log('No data in Clay sheet');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);
  console.log(`Clay sheet has ${dataRows.length} rows\n`);

  // Map header to indices
  const colIndex = {};
  header.forEach((col, i) => { colIndex[col.toLowerCase().replace(/\s+/g, '_')] = i; });

  // STEP 4: Match and collect updates
  console.log('Step 3: Matching companies...');
  let matched = 0;
  let skipped = 0;
  const updates = [];

  for (const row of dataRows) {
    const clayName = row[colIndex['company_slug']] || row[colIndex['company_name']] || row[colIndex['name']];
    if (!clayName) continue;

    // Try to find matching company
    const slug = slugify(clayName);
    let company = bySlug.get(slug) || byName.get(clayName.toLowerCase());
    
    // Fallback: first word match
    if (!company) {
      const firstWord = clayName.split(/[\s\/\-]+/)[0].toLowerCase();
      const candidates = byFirstWord.get(firstWord);
      if (candidates?.length === 1) company = candidates[0];
    }

    if (!company) continue; // Not a company we need to enrich

    // Build update
    const update = { id: company.id, name: company.name };
    
    const linkedinUrl = row[colIndex['linkedin_url']];
    if (linkedinUrl) update.linkedin_url = linkedinUrl;
    
    const linkedinDesc = row[colIndex['linkedin_description']];
    if (linkedinDesc) update.linkedin_description = linkedinDesc;
    
    const employeeRange = row[colIndex['employee_range']];
    const employeeCount = row[colIndex['employee_count']];
    const normalizedRange = normalizeEmployeeRange(employeeRange, employeeCount);
    if (normalizedRange) update.employee_range = normalizedRange;
    if (employeeCount) update.employee_count = parseInt(employeeCount) || null;
    
    const website = row[colIndex['website']];
    if (website && !company.website) update.website = website;
    
    const foundedDate = row[colIndex['founded_date']];
    if (foundedDate) update.founded_year = parseInt(foundedDate) || null;
    
    const locality = row[colIndex['locality']];
    if (locality) {
      const parts = locality.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        update.hq_city = parts[0];
        update.hq_state = parts[1];
      }
    }
    
    const followerCount = row[colIndex['follower_count']];
    if (followerCount) update.linkedin_followers = parseInt(followerCount) || null;
    
    const enrichedAt = row[colIndex['enriched_at']];
    if (enrichedAt) update.linkedin_last_updated = enrichedAt;
    
    update.last_enriched_at = new Date().toISOString();

    // Only add if we have actual data (not just last_enriched_at)
    if (Object.keys(update).length > 3) {
      updates.push(update);
      matched++;
      // Remove from lookup to avoid duplicate processing
      bySlug.delete(slug);
      byName.delete(company.name.toLowerCase());
    }
  }

  console.log(`Matched ${matched} companies with Clay data\n`);

  // STEP 5: Apply updates
  if (updates.length === 0) {
    console.log('No updates to apply.');
    return;
  }

  console.log('Step 4: Applying updates...');
  let updated = 0;
  let failed = 0;

  for (const u of updates) {
    const { id, name, ...fields } = u;
    const { error } = await supabase
      .from('companies')
      .update(fields)
      .eq('id', id);

    if (error) {
      console.log(`✗ ${name}: ${error.message}`);
      failed++;
    } else {
      console.log(`✓ ${name}`);
      updated++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Companies needing enrichment: ${companies.length}`);
  console.log(`Matched in Clay: ${matched}`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Still need enrichment: ${companies.length - updated}`);
}

importClayEnrichment().catch(console.error);
