require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse CSV
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    // Handle commas inside quotes
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

// Create URL-friendly slug
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('Starting Space Industry import...\n');
  
  // Read CSV
  const csvPath = path.join(__dirname, '..', '..', 'space-industry-data.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const companies = parseCSV(csvContent);
  console.log(`Parsed ${companies.length} companies from CSV\n`);
  
  // Get industry/segment mappings
  const { data: industries } = await supabase.from('industries').select('id, name, slug');
  const { data: segments } = await supabase.from('segments').select('id, name, slug, industry_id');
  
  const industryMap = {};
  industries.forEach(i => {
    industryMap[i.name.toLowerCase()] = i.id;
    industryMap[i.slug] = i.id;
  });
  
  const segmentMap = {};
  segments.forEach(s => {
    segmentMap[s.name.toLowerCase()] = { id: s.id, industry_id: s.industry_id };
    segmentMap[s.slug] = { id: s.id, industry_id: s.industry_id };
  });
  
  console.log('Available industries:', industries.map(i => i.name).join(', '));
  console.log('Available segments:', segments.map(s => s.name).join(', '));
  console.log('');
  
  // Check for segments that might not exist
  const missingSegments = new Set();
  companies.forEach(c => {
    const segKey = c.segment?.toLowerCase();
    if (segKey && !segmentMap[segKey]) {
      missingSegments.add(c.segment);
    }
  });
  
  if (missingSegments.size > 0) {
    console.log('Segments not found in DB (will need to create):');
    missingSegments.forEach(s => console.log('  -', s));
    console.log('');
  }
  
  // Import companies
  let imported = 0;
  let skipped = 0;
  let errors = [];
  
  for (const row of companies) {
    const slug = createSlug(row.name);
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (existing) {
      console.log(`⏭️  Skipping ${row.name} (already exists)`);
      skipped++;
      continue;
    }
    
    // Look up segment
    const segKey = row.segment?.toLowerCase();
    const segmentInfo = segmentMap[segKey];
    
    // Build company record (tier is auto-computed from score)
    const company = {
      slug,
      name: row.name,
      description: row.notes || null,
      website: row.website ? `https://${row.website.replace(/^https?:\/\//, '')}` : null,
      hq_city: row.hq_city || null,
      hq_state: row.hq_state || null,
      hq_country: 'US',
      employee_count: row.employee_count ? parseInt(row.employee_count) : null,
      composite_score: row.composite_score ? parseFloat(row.composite_score) : null,
      messaging_hook: row.messaging_hook || null,
      notes: [row.signals, row.source_url].filter(Boolean).join('\n\nSource: '),
      ownership_type: row.ownership?.toLowerCase() || 'private',
      ticker_symbol: row.ticker || null,
    };
    
    // Insert company
    const { data: inserted, error } = await supabase
      .from('companies')
      .insert(company)
      .select('id, name')
      .single();
    
    if (error) {
      console.log(`❌ Error inserting ${row.name}: ${error.message}`);
      errors.push({ name: row.name, error: error.message });
      continue;
    }
    
    // Link to segment if found
    if (segmentInfo) {
      await supabase
        .from('company_segments')
        .insert({
          company_id: inserted.id,
          segment_id: segmentInfo.id
        });
    }
    
    // Add signal if present
    if (row.signals) {
      await supabase
        .from('signals')
        .insert({
          company_id: inserted.id,
          signal_type: row.signal_type?.toLowerCase() || 'news',
          headline: row.signals.slice(0, 200),
          description: row.signals,
          source_url: row.source_url || null,
          published_at: row.signal_date ? new Date(row.signal_date + '-01').toISOString() : new Date().toISOString()
        });
    }
    
    console.log(`✅ Imported ${row.name}`);
    imported++;
  }
  
  console.log('\n========================================');
  console.log(`Import complete!`);
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  }
}

main().catch(console.error);
