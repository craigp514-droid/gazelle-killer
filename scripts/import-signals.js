require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function parseCSV(content) {
  let lines = content.trim().split('\n');
  
  // Skip comment lines at the start
  while (lines[0]?.startsWith('#')) {
    lines = lines.slice(1);
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else current += char;
    }
    values.push(current.trim());
    
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
}

function createSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  console.log('Importing signals for space companies...\n');
  
  const csvPath = path.join(__dirname, '..', 'data', 'companies', 'space-aerospace.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const companies = parseCSV(csvContent);
  
  let added = 0;
  let skipped = 0;
  
  for (const row of companies) {
    if (!row.signals) {
      skipped++;
      continue;
    }
    
    const slug = createSlug(row.name);
    
    // Find company
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (!company) {
      skipped++;
      continue;
    }
    
    // Check if signal already exists for this company
    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('company_id', company.id)
      .limit(1);
    
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }
    
    // Parse signal date - handle various formats
    let signalDate = new Date().toISOString().split('T')[0];
    if (row.signal_date) {
      const d = row.signal_date.trim();
      if (d.match(/^\d{4}$/)) {
        // Year only (e.g., "2024")
        signalDate = d + '-06-15';
      } else if (d.match(/^\d{4}-\d{2}$/)) {
        // Year-month (e.g., "2024-03")
        signalDate = d + '-15';
      } else if (d.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Full date
        signalDate = d;
      }
    }
    
    // Map signal type to allowed values
    const signalTypeMap = {
      'event': 'funding_round',
      'funding': 'funding_round',
      'facility': 'new_facility',
      'partnership': 'partnership',
      'contract': 'contract_award',
      'acquisition': 'acquisition',
      'regulatory': 'regulatory_approval',
      'product': 'product_launch',
    };
    const rawType = (row.signal_type || 'event').toLowerCase();
    const signalType = signalTypeMap[rawType] || 'funding_round';
    
    // Insert signal with correct field names (minimal required fields)
    const { error } = await supabase
      .from('signals')
      .insert({
        company_id: company.id,
        signal_type: signalType,
        title: row.signals.slice(0, 200),
        summary: row.signals,
        signal_date: signalDate,
        source_url: row.source_url || null
      });
    
    if (error) {
      console.log(`❌ ${row.name}: ${error.message}`);
    } else {
      console.log(`✅ ${row.name}`);
      added++;
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Done! Added: ${added}, Skipped: ${skipped}`);
}

main().catch(console.error);
