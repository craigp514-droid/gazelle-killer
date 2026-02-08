require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse CSV (same as import script)
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });
}

function createSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Map Todd's segment names to our slugs
const SEGMENT_MAP = {
  'launch & space access': 'launch-space-access',
  'spacecraft components & subsystems': 'spacecraft-components',
  'spacecraft & satellite systems': 'spacecraft-satellite-systems',
  'data software & space intelligence': 'space-data-intelligence',
  'data, software & space intelligence': 'space-data-intelligence',
  'in-space services logistics & safety': 'in-space-services',
  'in-space services, logistics & safety': 'in-space-services',
  'earth observation sensing & geospatial intelligence': 'earth-observation',
  'earth observation & geospatial intelligence': 'earth-observation',
  'space stations habitats & orbital platforms': 'space-stations-habitats',
  'space stations, habitats & orbital platforms': 'space-stations-habitats',
  'communications pnt & connectivity': 'space-communications',
  'communications, pnt & connectivity': 'space-communications',
  'human spaceflight exploration & commercial space': 'human-spaceflight',
  'human spaceflight & commercial space': 'human-spaceflight',
  'research workforce & ecosystem enablement': 'space-research-ecosystem',
  'research, workforce & ecosystem': 'space-research-ecosystem',
  'in-space manufacturing materials & zero-gravity r&d': 'in-space-manufacturing',
  'in-space manufacturing & zero-g r&d': 'in-space-manufacturing',
  'space resources isru & off-world infrastructure': 'space-resources',
  'space resources & off-world infrastructure': 'space-resources',
  'ground infrastructure & mission operations': 'ground-infrastructure',
  'space tech': 'space-tech',
  'evtol': 'evtol',
};

async function main() {
  console.log('Loading segments...');
  
  // Get all segments
  const { data: segments } = await supabase.from('segments').select('id, slug, name');
  const segmentBySlug = {};
  segments.forEach(s => {
    segmentBySlug[s.slug] = s.id;
  });
  
  // Read CSV
  const csvPath = path.join(__dirname, '..', '..', 'space-industry-data.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const companies = parseCSV(csvContent);
  
  console.log(`Processing ${companies.length} companies...\n`);
  
  let linked = 0;
  let skipped = 0;
  let notFound = 0;
  
  for (const row of companies) {
    const companySlug = createSlug(row.name);
    const segmentName = row.segment?.toLowerCase();
    
    if (!segmentName) {
      skipped++;
      continue;
    }
    
    // Find segment
    const segmentSlug = SEGMENT_MAP[segmentName] || segmentName.replace(/[^a-z0-9]+/g, '-');
    const segmentId = segmentBySlug[segmentSlug];
    
    if (!segmentId) {
      console.log(`⚠️  No segment found for "${row.segment}"`);
      notFound++;
      continue;
    }
    
    // Find company
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', companySlug)
      .single();
    
    if (!company) {
      skipped++;
      continue;
    }
    
    // Check if already linked
    const { data: existing } = await supabase
      .from('company_segments')
      .select('id')
      .eq('company_id', company.id)
      .eq('segment_id', segmentId)
      .single();
    
    if (existing) {
      skipped++;
      continue;
    }
    
    // Link
    const { error } = await supabase
      .from('company_segments')
      .insert({
        company_id: company.id,
        segment_id: segmentId
      });
    
    if (error) {
      console.log(`❌ Error linking ${row.name}: ${error.message}`);
    } else {
      console.log(`✅ Linked ${row.name} → ${row.segment}`);
      linked++;
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Done! Linked: ${linked}, Skipped: ${skipped}, Not found: ${notFound}`);
}

main().catch(console.error);
