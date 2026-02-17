/**
 * Nightly export of all signals for Todd
 * Uploads to shared Google Drive folder so Todd has visibility
 * into what's already in the platform
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

async function exportSignals() {
  console.log('📊 Exporting signals for Todd...\n');

  // Get all signals with company info
  const { data: signals, error } = await supabase
    .from('signals')
    .select(`
      id,
      signal_type,
      signal_tier,
      signal_date,
      title,
      summary,
      source_url,
      source_name,
      status,
      created_at,
      companies (
        name,
        website,
        slug,
        composite_score,
        tier
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching signals:', error.message);
    return;
  }

  console.log(`Found ${signals.length} signals\n`);

  // Build CSV
  const headers = [
    'company_name',
    'company_slug', 
    'website',
    'company_score',
    'company_tier',
    'signal_type',
    'signal_tier',
    'signal_date',
    'title',
    'summary',
    'source_url',
    'source_name',
    'status',
    'created_at'
  ];

  const rows = signals.map(s => [
    s.companies?.name || '',
    s.companies?.slug || '',
    s.companies?.website || '',
    s.companies?.composite_score || '',
    s.companies?.tier || '',
    s.signal_type || '',
    s.signal_tier || '',
    s.signal_date || '',
    (s.title || '').replace(/"/g, '""'),
    (s.summary || '').replace(/"/g, '""'),
    s.source_url || '',
    s.source_name || '',
    s.status || 'active',
    s.created_at || ''
  ]);

  // Escape and format CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => 
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
        ? `"${cell}"`
        : cell
    ).join(','))
  ].join('\n');

  // Upload to Google Drive
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const today = new Date().toISOString().split('T')[0];
  const filename = `signals-current-${today}.csv`;

  // Check if file already exists (update) or create new
  const { data: existing } = await drive.files.list({
    q: `name = '${filename}' and '${SHARED_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name)'
  });

  let fileId;
  if (existing.files?.length > 0) {
    // Update existing
    fileId = existing.files[0].id;
    await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: 'text/csv',
        body: csvContent
      }
    });
    console.log(`✓ Updated: ${filename}`);
  } else {
    // Create new
    const { data: newFile } = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [SHARED_FOLDER_ID]
      },
      media: {
        mimeType: 'text/csv',
        body: csvContent
      },
      fields: 'id, name'
    });
    fileId = newFile.id;
    console.log(`✓ Created: ${filename}`);
  }

  // Also create/update a "latest" file that's always current
  const latestFilename = 'signals-current-LATEST.csv';
  const { data: latestExisting } = await drive.files.list({
    q: `name = '${latestFilename}' and '${SHARED_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name)'
  });

  if (latestExisting.files?.length > 0) {
    await drive.files.update({
      fileId: latestExisting.files[0].id,
      media: {
        mimeType: 'text/csv',
        body: csvContent
      }
    });
    console.log(`✓ Updated: ${latestFilename}`);
  } else {
    await drive.files.create({
      requestBody: {
        name: latestFilename,
        parents: [SHARED_FOLDER_ID]
      },
      media: {
        mimeType: 'text/csv',
        body: csvContent
      },
      fields: 'id, name'
    });
    console.log(`✓ Created: ${latestFilename}`);
  }

  console.log(`\n✅ Export complete: ${signals.length} signals`);
}

exportSignals().catch(console.error);
