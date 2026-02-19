/**
 * Setup Todd's daily workflow files in shared Drive
 */
const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '../.env.google' });

const FOLDER_ID = '1HnJdC2OMNziNKrfkiqVg1t1GYagq6qdT';

async function setup() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // 1. Create template CSV
  const templateCSV = `company_name,website,signal_type,signal_tier,signal_date,title,source_url,messaging_hook
Energy Vault,energyvault.com,funding_round,3,2026-02-18,"$135.5M financing closed",https://businesswire.com/xxx,"New financing + Peak Energy supply deal"
Peak Energy,peakenergy.com,partnership,4,2026-02-18,"1.5 GWh supply agreement with Energy Vault",https://source.com,"US-manufactured sodium-ion for data centers"`;

  await uploadFile(drive, 'daily-signals-TEMPLATE.csv', templateCSV, 'text/csv');

  // 2. Create instructions
  const instructions = fs.readFileSync('docs/TODD-GOSPEL.md', 'utf-8');
  await uploadFile(drive, 'TODD-DAILY-SIGNAL-WORKFLOW.md', instructions, 'text/markdown');

  console.log('\n✅ Setup complete!');
}

async function uploadFile(drive, name, content, mimeType) {
  const { data: existing } = await drive.files.list({
    q: `name = '${name}' and '${FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id)'
  });

  if (existing.files?.length) {
    await drive.files.update({
      fileId: existing.files[0].id,
      media: { mimeType, body: content }
    });
    console.log(`✓ Updated ${name}`);
  } else {
    await drive.files.create({
      requestBody: { name, parents: [FOLDER_ID] },
      media: { mimeType, body: content }
    });
    console.log(`✓ Created ${name}`);
  }
}

setup().catch(console.error);
