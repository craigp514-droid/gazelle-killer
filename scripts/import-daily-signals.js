/**
 * Import daily signals from Todd's CSV
 * Handles both new companies and signals for existing companies
 * 
 * Expected CSV format:
 * company_name,website,industry,segment,sub_segment,signal_code,signal_score,signal_date,signal_text,source_url,messaging_hook
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Check if enrichment is stale (> 6 months)
function needsReEnrichment(lastEnrichedAt) {
  if (!lastEnrichedAt) return true;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(lastEnrichedAt) < sixMonthsAgo;
}

async function importDailySignals(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true,
    trim: true 
  });

  console.log(`📥 Found ${records.length} signals to import\n`);

  // Get existing companies for matching
  const { data: companies } = await supabase.from('companies').select('id, slug, name, last_enriched_at');
  const companyBySlug = {};
  const companyByName = {};
  companies?.forEach(c => { 
    companyBySlug[c.slug] = c;
    companyByName[c.name.toLowerCase()] = c;
  });

  // Get segments for linking
  const { data: segments } = await supabase.from('segments').select('id, name, slug');
  const segmentByName = {};
  const segmentBySlug = {};
  segments?.forEach(s => { 
    segmentByName[s.name.toLowerCase()] = s;
    segmentBySlug[s.slug] = s;
  });

  let newCompanies = 0;
  let existingCompanies = 0;
  let newSignals = 0;
  let needsEnrichment = [];
  let errors = 0;

  for (const row of records) {
    const companyName = row.company_name || row.Company || row.name;
    if (!companyName) {
      errors++;
      continue;
    }
    
    const companySlug = row.company_slug || slugify(companyName);
    const website = row.website || row.Website;
    
    // Check if company exists
    let company = companyBySlug[companySlug] || companyByName[companyName.toLowerCase()];
    let isNewCompany = false;

    if (!company) {
      // Create new company
      isNewCompany = true;
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companySlug,
          website: website || null,
          hq_city: row.hq_city || null,
          hq_state: row.hq_state || null,
          composite_score: parseInt(row.signal_score) || 7,
          messaging_hook: row.messaging_hook || null,
          notes: row.notes || null,
        })
        .select()
        .single();

      if (companyError) {
        console.log(`✗ Failed to create company ${companyName}: ${companyError.message}`);
        errors++;
        continue;
      }

      company = newCompany;
      companyBySlug[companySlug] = company;
      companyByName[companyName.toLowerCase()] = company;
      newCompanies++;
      console.log(`✓ Created company: ${companyName}`);

      // Link to segment if provided
      const segmentName = (row.segment || row.sub_segment || '').toLowerCase();
      const segment = segmentByName[segmentName] || segmentBySlug[segmentName];
      if (segment) {
        await supabase.from('company_segments').insert({
          company_id: company.id,
          segment_id: segment.id,
          is_primary: true
        }).onConflict('company_id,segment_id').ignore();
      }

      // Queue for enrichment
      if (website) {
        needsEnrichment.push({ name: companyName, website });
      }
    } else {
      existingCompanies++;
      
      // Check if needs re-enrichment
      if (website && needsReEnrichment(company.last_enriched_at)) {
        needsEnrichment.push({ name: companyName, website });
      }
    }

    // Create signal
    const signalCode = row.signal_code || row.signal_type || 'EXPANSION_ANNOUNCEMENT';
    let signalDate = row.signal_date || new Date().toISOString().split('T')[0];
    // Handle YYYY-MM format (add -01 for first of month)
    if (/^\d{4}-\d{2}$/.test(signalDate)) {
      signalDate = signalDate + '-01';
    }
    const signalText = row.signal_text || row.signal_title || row.Signal || 'Signal detected';
    
    // Check for duplicate signal
    const { data: existingSignal } = await supabase
      .from('signals')
      .select('id')
      .eq('company_id', company.id)
      .eq('signal_type', signalCode.toLowerCase())
      .eq('signal_date', signalDate)
      .single();

    if (existingSignal) {
      console.log(`↻ Signal exists: ${companyName} - ${signalCode}`);
      continue;
    }

    const { error: signalError } = await supabase.from('signals').insert({
      company_id: company.id,
      signal_type: signalCode.toLowerCase(),
      title: signalText.substring(0, 200),
      description: signalText.length > 200 ? signalText : null,
      signal_date: signalDate,
      signal_strength: parseInt(row.signal_score) || 7,
      source_url: row.source_url || row['Source URL'] || null,
      status: 'active',
    });

    if (signalError) {
      console.log(`✗ Failed to create signal for ${companyName}: ${signalError.message}`);
      errors++;
      continue;
    }

    newSignals++;
    const isTier1 = ['SITE_SEARCH', 'GOV_EQUITY'].includes(signalCode.toUpperCase());
    console.log(`${isTier1 ? '🔥' : '✓'} Signal: ${companyName} - ${signalCode}`);
  }

  // Write companies needing enrichment to clay-queue.csv
  if (needsEnrichment.length > 0) {
    const queuePath = 'data/clay-queue.csv';
    const existingQueue = fs.existsSync(queuePath) ? fs.readFileSync(queuePath, 'utf-8') : 'Company Name,Website\n';
    const existingLines = existingQueue.trim().split('\n').slice(1);
    const existingCompanies = new Set(existingLines.map(l => l.split(',')[0]));
    
    const newEntries = needsEnrichment
      .filter(c => !existingCompanies.has(c.name))
      .map(c => `${c.name},${c.website}`);
    
    if (newEntries.length > 0) {
      fs.writeFileSync(queuePath, existingQueue.trim() + '\n' + newEntries.join('\n') + '\n');
      console.log(`\n📤 Queued ${newEntries.length} companies for Clay enrichment`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`New companies: ${newCompanies}`);
  console.log(`Existing companies: ${existingCompanies}`);
  console.log(`New signals: ${newSignals}`);
  console.log(`Queued for enrichment: ${needsEnrichment.length}`);
  console.log(`Errors: ${errors}`);
}

// Main
const csvPath = process.argv[2];
if (!csvPath) {
  console.log('Usage: node import-daily-signals.js <csv-path>');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.log(`File not found: ${csvPath}`);
  process.exit(1);
}

importDailySignals(csvPath).catch(console.error);
