/**
 * Import daily signals from Todd's CSV
 * Handles both new companies and signals for existing companies
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

async function importDailySignals(csvContent) {
  const records = parse(csvContent, { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true,
    trim: true 
  });

  console.log(`Found ${records.length} signals to import\n`);

  // Get existing companies
  const { data: companies } = await supabase.from('companies').select('id, slug, name');
  const companyBySlug = {};
  companies?.forEach(c => { companyBySlug[c.slug] = c; });

  // Get segments for linking
  const { data: segments } = await supabase.from('segments').select('id, name, slug');
  const segmentByName = {};
  segments?.forEach(s => { segmentByName[s.name.toLowerCase()] = s; });

  let newCompanies = 0;
  let newSignals = 0;
  let errors = 0;

  for (const row of records) {
    const companyName = row.company_name;
    const companySlug = row.company_slug || slugify(companyName);
    const isNewCompany = row.is_new_company === 'true';
    
    let company = companyBySlug[companySlug];

    // Create new company if needed
    if (isNewCompany && !company) {
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companySlug,
          website: row.website || null,
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
      newCompanies++;
      console.log(`✓ Created company: ${companyName}`);

      // Link to segment if provided
      const segmentName = row.segment?.toLowerCase();
      const segment = segmentByName[segmentName];
      if (segment) {
        await supabase.from('company_segments').insert({
          company_id: company.id,
          segment_id: segment.id,
          is_primary: true
        });
      }
    }

    // NEVER SKIP - if company not found, create it anyway
    if (!company) {
      console.log(`⚠ Expected existing company "${companyName}" not found — creating anyway`);
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companySlug,
          website: row.website || null,
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
      newCompanies++;
    }

    // Create signal
    const { error: signalError } = await supabase.from('signals').insert({
      company_id: company.id,
      signal_type: row.signal_type || 'new_facility',
      title: row.signal_title?.substring(0, 200) || 'Signal',
      signal_date: row.signal_date || new Date().toISOString().split('T')[0],
      signal_strength: parseInt(row.signal_score) || 7,
      source_url: row.source_url || null,
      status: 'active',
    });

    if (signalError) {
      console.log(`✗ Failed to create signal for ${companyName}: ${signalError.message}`);
      errors++;
      continue;
    }

    newSignals++;
    const isSiteSearch = row.signal_type === 'site_search';
    console.log(`${isSiteSearch ? '🔥' : '✓'} Signal: ${companyName} - ${row.signal_type}`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`New companies: ${newCompanies}`);
  console.log(`New signals: ${newSignals}`);
  console.log(`Errors: ${errors}`);
}

// Main
const csvPath = process.argv[2];
if (!csvPath) {
  console.log('Usage: node import-daily-signals.js <csv-path-or-content>');
  process.exit(1);
}

if (fs.existsSync(csvPath)) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  importDailySignals(content).catch(console.error);
} else {
  // Assume it's CSV content passed directly
  importDailySignals(csvPath).catch(console.error);
}
