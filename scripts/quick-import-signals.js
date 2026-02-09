const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Get companies
  const { data: companies } = await supabase.from('companies').select('id, name');
  const companyByName = {};
  companies.forEach(c => { companyByName[c.name.toLowerCase()] = c; });
  
  // Read CSV
  const csv = fs.readFileSync('data-imports/todd-signals/expansion-signals-export-2026-02-08.csv', 'utf-8');
  const records = parse(csv, { columns: true, skip_empty_lines: true, relax_quotes: true });
  
  console.log('Found', records.length, 'records');
  
  let imported = 0;
  let skipped = 0;
  
  for (const row of records) {
    const company = companyByName[row.Company?.toLowerCase()];
    if (!company) {
      skipped++;
      continue;
    }
    
    const { error } = await supabase.from('signals').insert({
      company_id: company.id,
      signal_type: 'new_facility',
      title: (row.Signal || 'Signal').substring(0, 200),
      signal_date: '2025-01-01',
      source_url: row['Source URL'] || null,
    });
    
    if (error) {
      console.log('Error:', row.Company, error.message);
    } else {
      imported++;
    }
  }
  
  console.log('Imported:', imported, 'Skipped:', skipped);
}

run().catch(console.error);
