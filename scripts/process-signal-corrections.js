/**
 * Process signal corrections from Todd
 * Reads signal-corrections.csv from shared folder and applies updates
 * 
 * Expected format:
 * company_slug,field,new_value
 * 
 * Supported fields:
 * - website (updates company website)
 * - source_url (updates signal source URL)
 * - signal_type, signal_tier, status, etc.
 * - DELETE (removes the signal)
 */
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '../.env.google' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SHARED_FOLDER_ID = '1HnJdC2OMNziNKrfkiqVg1t1GYagq6qdT';

async function processCorrections() {
  console.log('📝 Processing signal corrections...\n');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Find corrections file
  const { data: files } = await drive.files.list({
    q: `name = 'signal-corrections.csv' and '${SHARED_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, modifiedTime)'
  });

  if (!files.files?.length) {
    console.log('No signal-corrections.csv found - nothing to process');
    return;
  }

  const file = files.files[0];
  console.log(`Found: ${file.name} (modified: ${file.modifiedTime})\n`);

  // Download content
  const { data: content } = await drive.files.get({
    fileId: file.id,
    alt: 'media'
  });

  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length <= 1) {
    console.log('File is empty (header only)');
    return;
  }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const slugIdx = header.indexOf('company_slug');
  const fieldIdx = header.indexOf('field');
  const valueIdx = header.indexOf('new_value');

  if (slugIdx === -1 || fieldIdx === -1 || valueIdx === -1) {
    console.log('❌ Invalid header. Expected: company_slug,field,new_value');
    return;
  }

  let updated = 0;
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const slug = parts[slugIdx]?.trim();
    const field = parts[fieldIdx]?.trim();
    const value = parts.slice(valueIdx).join(',').trim(); // Handle commas in value

    if (!slug || !field) continue;

    // Find company
    const { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (!company) {
      console.log(`⚠ Company not found: ${slug}`);
      errors++;
      continue;
    }

    // Handle company-level updates
    if (['website', 'score', 'messaging_hook', 'description'].includes(field)) {
      const { error } = await supabase
        .from('companies')
        .update({ [field]: value })
        .eq('id', company.id);

      if (error) {
        console.log(`✗ Failed to update ${company.name}.${field}: ${error.message}`);
        errors++;
      } else {
        console.log(`✓ Updated ${company.name}.${field} = ${value.substring(0, 50)}...`);
        updated++;
      }
    }
    // Handle signal-level updates
    else if (['source_url', 'signal_type', 'signal_tier', 'status', 'title', 'summary'].includes(field)) {
      const { error } = await supabase
        .from('signals')
        .update({ [field]: value })
        .eq('company_id', company.id);

      if (error) {
        console.log(`✗ Failed to update signal for ${company.name}: ${error.message}`);
        errors++;
      } else {
        console.log(`✓ Updated signal for ${company.name}.${field}`);
        updated++;
      }
    }
    // Handle DELETE
    else if (field.toUpperCase() === 'DELETE') {
      const { error } = await supabase
        .from('signals')
        .delete()
        .eq('company_id', company.id);

      if (error) {
        console.log(`✗ Failed to delete signal for ${company.name}: ${error.message}`);
        errors++;
      } else {
        console.log(`✓ Deleted signal for ${company.name}`);
        updated++;
      }
    }
    else {
      console.log(`⚠ Unknown field: ${field}`);
      errors++;
    }
  }

  // Rename processed file
  const processedName = `signal-corrections-processed-${new Date().toISOString().split('T')[0]}.csv`;
  await drive.files.update({
    fileId: file.id,
    requestBody: { name: processedName }
  });

  console.log(`\n--- Summary ---`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nFile renamed to: ${processedName}`);
}

processCorrections().catch(console.error);
