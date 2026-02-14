/**
 * Import projects from Feeny's CSV
 * Handles both existing companies and creates new ones if needed
 * 
 * Expected CSV format:
 * Company,Website,Location,State,Jobs,Project_Type,Announcement_Date,FDI_Origin,Source_URL,Notes
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

async function importProjects(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true,
    trim: true 
  });

  console.log(`📥 Found ${records.length} projects to import\n`);

  // Get existing companies
  const { data: companies } = await supabase.from('companies').select('id, slug, name');
  const companyBySlug = {};
  const companyByName = {};
  companies?.forEach(c => { 
    companyBySlug[c.slug] = c;
    companyByName[c.name.toLowerCase()] = c;
  });

  let newCompanies = 0;
  let existingCompanies = 0;
  let projectsAdded = 0;
  let needsToddReview = [];
  let errors = 0;

  for (const row of records) {
    const companyName = row.Company || row.company_name || row.company;
    if (!companyName) {
      errors++;
      continue;
    }
    
    const companySlug = slugify(companyName);
    const website = row.Website || row.website;
    
    // Check if company exists
    let company = companyBySlug[companySlug] || companyByName[companyName.toLowerCase()];

    if (!company) {
      // Create new company (minimal record)
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companySlug,
          website: website || null,
          hq_state: row.FDI_Origin ? null : row.State, // If FDI, state is project location not HQ
          notes: row.FDI_Origin ? `FDI: ${row.FDI_Origin}` : null,
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
      needsToddReview.push({ name: companyName, website: website || '' });
      console.log(`✓ Created company: ${companyName} (needs Todd review)`);
    } else {
      existingCompanies++;
    }

    // Parse announcement date
    let announcementDate = row.Announcement_Date || row.announcement_date;
    if (announcementDate) {
      // Handle various date formats
      if (/^\d{4}-\d{2}$/.test(announcementDate)) {
        announcementDate = announcementDate + '-01';
      } else if (/^\d{4}$/.test(announcementDate)) {
        announcementDate = announcementDate + '-01-01';
      }
    }

    // Create project
    const { error: projectError } = await supabase.from('projects').insert({
      company_id: company.id,
      location_city: row.Location || row.location_city || null,
      location_state: row.State || row.location_state || null,
      jobs_announced: parseInt(row.Jobs || row.jobs) || null,
      project_type: row.Project_Type || row.project_type || null,
      announcement_date: announcementDate || null,
      fdi_origin: row.FDI_Origin || row.fdi_origin || null,
      source_url: row.Source_URL || row.source_url || null,
      notes: row.Notes || row.notes || null,
    });

    if (projectError) {
      console.log(`✗ Failed to add project for ${companyName}: ${projectError.message}`);
      errors++;
      continue;
    }

    projectsAdded++;
    const isFDI = row.FDI_Origin ? ' (FDI: ' + row.FDI_Origin + ')' : '';
    console.log(`✓ Project: ${companyName} → ${row.Location || '?'}, ${row.State || '?'}${isFDI}`);
  }

  // Write companies needing Todd review
  if (needsToddReview.length > 0) {
    const reviewPath = 'data/companies-need-todd-review.csv';
    const existingReview = fs.existsSync(reviewPath) ? fs.readFileSync(reviewPath, 'utf-8') : 'company_name,website\n';
    const newEntries = needsToddReview.map(c => `"${c.name}",${c.website}`);
    fs.writeFileSync(reviewPath, existingReview.trim() + '\n' + newEntries.join('\n') + '\n');
    console.log(`\n📋 ${needsToddReview.length} companies need Todd review → data/companies-need-todd-review.csv`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`New companies: ${newCompanies}`);
  console.log(`Existing companies: ${existingCompanies}`);
  console.log(`Projects added: ${projectsAdded}`);
  console.log(`Needs Todd review: ${needsToddReview.length}`);
  console.log(`Errors: ${errors}`);
}

// Main
const csvPath = process.argv[2];
if (!csvPath) {
  console.log('Usage: node import-projects.js <csv-path>');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.log(`File not found: ${csvPath}`);
  process.exit(1);
}

importProjects(csvPath).catch(console.error);
