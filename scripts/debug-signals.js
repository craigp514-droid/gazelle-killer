require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function parseCSV(content) {
  const lines = content.trim().split('\n');
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
  const csvPath = path.join(__dirname, '..', 'data', 'companies', 'space-aerospace.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const companies = parseCSV(csvContent);
  
  console.log('First 3 rows from CSV:');
  companies.slice(0, 3).forEach(c => {
    console.log(`Name: ${c.name}, Slug: ${createSlug(c.name)}`);
    console.log(`Signals: ${c.signals?.slice(0, 50)}...`);
    console.log('');
  });
  
  // Check if companies exist in DB
  const testSlugs = companies.slice(0, 3).map(c => createSlug(c.name));
  for (const slug of testSlugs) {
    const { data } = await supabase.from('companies').select('id, name').eq('slug', slug).single();
    console.log(`DB lookup "${slug}":`, data ? `Found: ${data.name}` : 'NOT FOUND');
  }
  
  // Check signal count for these companies
  console.log('\nSignal counts:');
  for (const slug of testSlugs) {
    const { data: company } = await supabase.from('companies').select('id').eq('slug', slug).single();
    if (company) {
      const { count } = await supabase.from('signals').select('*', { count: 'exact', head: true }).eq('company_id', company.id);
      console.log(`${slug}: ${count} signals`);
    }
  }
}

main();
