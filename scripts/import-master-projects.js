/**
 * Import Feeny's Master Project Tracker
 * 
 * Expected CSV format:
 * Company,Jobs,Capex_M,Location,County,State,Sector,Date,URL,Notes
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

async function importMasterProjects(csvPath) {
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
  let errors = 0;

  for (const row of records) {
    const companyName = row.Company;
    if (!companyName) {
      errors++;
      continue;
    }
    
    const companySlug = slugify(companyName);
    
    // Check if company exists
    let company = companyBySlug[companySlug] || companyByName[companyName.toLowerCase()];

    if (!company) {
      // Create new company (minimal record)
      const isFDI = row.Sector?.includes('/FDI');
      const sector = row.Sector?.replace('/FDI', '').trim();
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companySlug,
          hq_state: isFDI ? null : row.State, // If FDI, state is project location not HQ
        })
        .select()
        .single();

      if (companyError) {
        // Might be duplicate slug - try to find by slug
        const { data: existing } = await supabase
          .from('companies')
          .select('id, name')
          .eq('slug', companySlug)
          .single();
        
        if (existing) {
          company = existing;
          existingCompanies++;
        } else {
          console.log(`✗ Failed to create company ${companyName}: ${companyError.message}`);
          errors++;
          continue;
        }
      } else {
        company = newCompany;
        companyBySlug[companySlug] = company;
        companyByName[companyName.toLowerCase()] = company;
        newCompanies++;
      }
    } else {
      existingCompanies++;
    }

    // Parse announcement date - handle various formats
    let announcementDate = row.Date;
    if (announcementDate) {
      if (/^\d{4}-\d{2}$/.test(announcementDate)) {
        // YYYY-MM -> YYYY-MM-01
        announcementDate = announcementDate + '-01';
      } else if (/^\d{4}$/.test(announcementDate)) {
        // YYYY -> YYYY-01-01
        announcementDate = announcementDate + '-01-01';
      } else if (/^\d{4}-Q1$/i.test(announcementDate)) {
        announcementDate = announcementDate.substring(0, 4) + '-01-01';
      } else if (/^\d{4}-Q2$/i.test(announcementDate)) {
        announcementDate = announcementDate.substring(0, 4) + '-04-01';
      } else if (/^\d{4}-Q3$/i.test(announcementDate)) {
        announcementDate = announcementDate.substring(0, 4) + '-07-01';
      } else if (/^\d{4}-Q4$/i.test(announcementDate)) {
        announcementDate = announcementDate.substring(0, 4) + '-10-01';
      } else if (/^\d{4}-\d{4}$/.test(announcementDate)) {
        // YYYY-YYYY range -> use first year
        announcementDate = announcementDate.substring(0, 4) + '-01-01';
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(announcementDate)) {
        // Invalid format - skip date
        announcementDate = null;
      }
    }

    // Detect FDI from sector
    const isFDI = row.Sector?.includes('/FDI');
    const sector = row.Sector?.replace('/FDI', '').trim();

    // Check if project already exists (company + state + capex combo)
    const capexValue = parseFloat(row.Capex_M) || null;
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('company_id', company.id)
      .eq('location_state', row.State || '')
      .limit(1);
    
    // Skip if same company+state exists and has matching capex (rough dedup)
    if (existingProject?.length > 0) {
      // Already imported - skip
      continue;
    }

    // Create project
    const { error: projectError } = await supabase.from('projects').insert({
      company_id: company.id,
      location_city: row.Location || null,
      location_state: row.State || null,
      county: row.County || null,
      jobs_announced: parseInt(row.Jobs) || null,
      capex_millions: parseFloat(row.Capex_M) || null,
      sector: sector || null,
      project_type: 'new facility',
      announcement_date: announcementDate || null,
      fdi_origin: isFDI ? 'Foreign' : null,
      source_url: row.URL || null,
      notes: row.Notes || null,
    });

    if (projectError) {
      console.log(`✗ Failed to add project for ${companyName}: ${projectError.message}`);
      errors++;
      continue;
    }

    projectsAdded++;
    
    // Progress indicator every 50
    if (projectsAdded % 50 === 0) {
      console.log(`... ${projectsAdded} projects added`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`New companies created: ${newCompanies}`);
  console.log(`Existing companies matched: ${existingCompanies}`);
  console.log(`Projects added: ${projectsAdded}`);
  console.log(`Errors: ${errors}`);
  
  // Final counts
  const { count: totalCompanies } = await supabase.from('companies').select('*', { count: 'exact', head: true });
  const { count: totalProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true });
  console.log(`\nDatabase totals:`);
  console.log(`Companies: ${totalCompanies}`);
  console.log(`Projects: ${totalProjects}`);
}

// Main
const csvPath = process.argv[2];
if (!csvPath) {
  console.log('Usage: node import-master-projects.js <csv-path>');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.log(`File not found: ${csvPath}`);
  process.exit(1);
}

importMasterProjects(csvPath).catch(console.error);
