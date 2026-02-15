/**
 * Import industry + segment assignments from Todd's completed file
 * - ALL companies get industry tag
 * - Only target industries get segment assignments
 * 
 * CSV format: company_name,website,project_sector,project_state,industry,segment
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

async function importIndustrySegments(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true,
    trim: true 
  });

  console.log(`📥 Found ${records.length} rows to process\n`);

  // Get all segments from DB (for target industries only)
  const { data: dbSegments } = await supabase.from('segments').select('id, name, slug');
  const segmentBySlug = {};
  const segmentByName = {};
  dbSegments?.forEach(s => { 
    segmentBySlug[s.slug] = s;
    segmentByName[s.name.toLowerCase()] = s;
  });
  console.log('Known segments in DB:', dbSegments?.length);

  // Get all companies
  const { data: companies } = await supabase.from('companies').select('id, name, slug');
  const companyBySlug = {};
  const companyByName = {};
  companies?.forEach(c => { 
    companyBySlug[c.slug] = c;
    companyByName[c.name.toLowerCase()] = c;
  });
  console.log('Companies in DB:', companies?.length);

  let industryUpdates = 0;
  let segmentAssignments = 0;
  let websiteUpdates = 0;
  let notFound = 0;
  let errors = 0;

  for (const row of records) {
    const companyName = row.company_name;
    if (!companyName) continue;
    
    const companySlug = slugify(companyName);
    const company = companyBySlug[companySlug] || companyByName[companyName.toLowerCase()];
    
    if (!company) {
      console.log(`⚠ Not found: ${companyName}`);
      notFound++;
      continue;
    }

    const industry = row.industry?.trim();
    const segment = row.segment?.trim();
    const website = row.website?.trim();

    // Update industry (always)
    if (industry && industry !== 'Unknown') {
      const { error } = await supabase
        .from('companies')
        .update({ industry })
        .eq('id', company.id);
      
      if (!error) {
        industryUpdates++;
      } else {
        console.log(`✗ Industry update failed for ${companyName}: ${error.message}`);
        errors++;
      }
    }

    // Update website if provided and missing
    if (website && website.length > 3) {
      const { data: current } = await supabase
        .from('companies')
        .select('website')
        .eq('id', company.id)
        .single();
      
      if (!current?.website) {
        await supabase.from('companies').update({ website }).eq('id', company.id);
        websiteUpdates++;
      }
    }

    // Assign segment if it exists in our DB (target industries only)
    if (segment) {
      const segmentSlug = slugify(segment);
      const dbSegment = segmentBySlug[segmentSlug] || segmentByName[segment.toLowerCase()];
      
      if (dbSegment) {
        // Check if already assigned
        const { data: existing } = await supabase
          .from('company_segments')
          .select('id')
          .eq('company_id', company.id)
          .eq('segment_id', dbSegment.id)
          .single();
        
        if (!existing) {
          const { error } = await supabase
            .from('company_segments')
            .insert({
              company_id: company.id,
              segment_id: dbSegment.id,
              is_primary: true
            });
          
          if (!error) {
            segmentAssignments++;
          } else if (!error.message.includes('duplicate')) {
            errors++;
          }
        }
      }
      // Note: We don't warn about missing segments - those are non-target industries
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Industry updates: ${industryUpdates}`);
  console.log(`Segment assignments: ${segmentAssignments}`);
  console.log(`Website updates: ${websiteUpdates}`);
  console.log(`Companies not found: ${notFound}`);
  console.log(`Errors: ${errors}`);

  // Show distribution
  const { data: industryDist } = await supabase
    .from('companies')
    .select('industry');
  
  const dist = {};
  industryDist?.forEach(c => {
    const ind = c.industry || 'NULL';
    dist[ind] = (dist[ind] || 0) + 1;
  });
  
  console.log('\n--- Industry Distribution ---');
  Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([ind, count]) => console.log(`${ind}: ${count}`));
}

// Main
const csvPath = process.argv[2];
if (!csvPath) {
  console.log('Usage: node import-industry-segments.js <csv-path>');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.log(`File not found: ${csvPath}`);
  process.exit(1);
}

importIndustrySegments(csvPath).catch(console.error);
