/**
 * Import Clay enrichment data from Google Sheet
 * Reads from "Clay-Enrichment-Output" sheet and updates company records
 */
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

async function importClayEnrichment() {
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  
  // Find the Clay-Enrichment-Output sheet
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const { data: files } = await drive.files.list({
    q: "name = 'Clay-Enrichment-Output' and mimeType = 'application/vnd.google-apps.spreadsheet'",
    fields: 'files(id, name)',
  });

  if (!files.files?.length) {
    console.log('❌ Sheet "Clay-Enrichment-Output" not found in Drive');
    console.log('   Create it with columns: company_slug, linkedin_url, linkedin_description, employee_range, website, enriched_at');
    return;
  }

  const sheetId = files.files[0].id;
  console.log(`📊 Found sheet: ${files.files[0].name} (${sheetId})\n`);

  // Read the data
  const { data: sheetData } = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'A:F', // company_slug through enriched_at
  });

  const rows = sheetData.values || [];
  if (rows.length <= 1) {
    console.log('No data rows found (only header or empty)');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);
  
  console.log(`Found ${dataRows.length} rows to process\n`);

  // Map header to indices
  const colIndex = {};
  header.forEach((col, i) => { colIndex[col.toLowerCase().replace(/\s+/g, '_')] = i; });

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of dataRows) {
    const slug = row[colIndex['company_slug']];
    if (!slug) {
      skipped++;
      continue;
    }

    // Find company
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, last_enriched_at')
      .eq('slug', slug)
      .single();

    if (!company) {
      console.log(`⚠ Company not found: ${slug}`);
      notFound++;
      continue;
    }

    // Build update object (only non-empty fields)
    const updates = {};
    
    const linkedinUrl = row[colIndex['linkedin_url']];
    if (linkedinUrl) updates.linkedin_url = linkedinUrl;
    
    const linkedinDesc = row[colIndex['linkedin_description']];
    if (linkedinDesc) updates.linkedin_description = linkedinDesc;
    
    const employeeRange = row[colIndex['employee_range']];
    if (employeeRange) updates.employee_range = employeeRange;
    
    const website = row[colIndex['website']];
    if (website && !company.website) updates.website = website;
    
    // Always update last_enriched_at
    updates.last_enriched_at = new Date().toISOString();

    if (Object.keys(updates).length === 1) {
      // Only last_enriched_at, no actual data
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', company.id);

    if (error) {
      console.log(`✗ Failed to update ${company.name}: ${error.message}`);
    } else {
      console.log(`✓ Updated: ${company.name}`);
      updated++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Not found: ${notFound}`);
}

importClayEnrichment().catch(console.error);
