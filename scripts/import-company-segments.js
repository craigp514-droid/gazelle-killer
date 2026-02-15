/**
 * Import segment assignments for existing companies
 * Used by Todd to categorize companies into industries/segments
 * 
 * Expected CSV format:
 * company_name,website,industry,segment
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

async function importSegments(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true,
    trim: true 
  });

  console.log(`📥 Found ${records.length} rows to process\n`);

  // Get all industries and segments
  const { data: industries } = await supabase.from('industries').select('id, name, slug');
  const { data: segments } = await supabase.from('segments').select('id, name, slug, industry_id');
  
  const industryBySlug = {};
  const industryByName = {};
  industries?.forEach(i => { 
    industryBySlug[i.slug] = i;
    industryByName[i.name.toLowerCase()] = i;
  });
  
  const segmentBySlug = {};
  const segmentByName = {};
  segments?.forEach(s => { 
    segmentBySlug[s.slug] = s;
    segmentByName[s.name.toLowerCase()] = s;
  });

  // Get all companies
  const { data: companies } = await supabase.from('companies').select('id, name, slug, website');
  const companyBySlug = {};
  const companyByName = {};
  companies?.forEach(c => { 
    companyBySlug[c.slug] = c;
    companyByName[c.name.toLowerCase()] = c;
  });

  let updated = 0;
  let websiteUpdates = 0;
  let segmentAssignments = 0;
  let notFound = 0;
  let errors = 0;

  for (const row of records) {
    const companyName = row.company_name || row.Company;
    if (!companyName) continue;
    
    const companySlug = slugify(companyName);
    const company = companyBySlug[companySlug] || companyByName[companyName.toLowerCase()];
    
    if (!company) {
      console.log(`⚠ Company not found: ${companyName}`);
      notFound++;
      continue;
    }

    // Update website if provided and company doesn't have one
    const website = row.website || row.Website;
    if (website && !company.website) {
      const { error } = await supabase
        .from('companies')
        .update({ website })
        .eq('id', company.id);
      
      if (!error) {
        websiteUpdates++;
      }
    }

    // Assign segment if provided
    const segmentName = row.segment || row.Segment;
    const industryName = row.industry || row.Industry;
    
    if (segmentName) {
      const segmentSlug = slugify(segmentName);
      const segment = segmentBySlug[segmentSlug] || segmentByName[segmentName.toLowerCase()];
      
      if (segment) {
        // Check if already assigned
        const { data: existing } = await supabase
          .from('company_segments')
          .select('id')
          .eq('company_id', company.id)
          .eq('segment_id', segment.id)
          .single();
        
        if (!existing) {
          const { error } = await supabase
            .from('company_segments')
            .insert({
              company_id: company.id,
              segment_id: segment.id,
              is_primary: true
            });
          
          if (!error) {
            segmentAssignments++;
            console.log(`✓ ${companyName} → ${segmentName}`);
          } else {
            console.log(`✗ Failed to assign ${companyName}: ${error.message}`);
            errors++;
          }
        }
      } else {
        console.log(`⚠ Segment not found: ${segmentName} (for ${companyName})`);
      }
    }

    updated++;
  }

  console.log(`\n--- Summary ---`);
  console.log(`Rows processed: ${updated}`);
  console.log(`Segment assignments: ${segmentAssignments}`);
  console.log(`Website updates: ${websiteUpdates}`);
  console.log(`Companies not found: ${notFound}`);
  console.log(`Errors: ${errors}`);
}

// Main
const csvPath = process.argv[2];
if (!csvPath) {
  console.log('Usage: node import-company-segments.js <csv-path>');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.log(`File not found: ${csvPath}`);
  process.exit(1);
}

importSegments(csvPath).catch(console.error);
