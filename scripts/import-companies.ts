/**
 * Import companies from CSV to Supabase
 * Usage: npx tsx scripts/import-companies.ts data-imports/semiconductor-companies-107.csv
 */

import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Map Todd's segment slugs to our DB slugs
const SEGMENT_SLUG_MAP: Record<string, string> = {
  'fabs': 'fabs-foundries',
  'equipment-front-end': 'equipment-frontend',
  'equipment-back-end': 'equipment-backend',
  'materials': 'materials-chemicals',
  'fabless': 'fabless',
  'testing': 'testing',
  'substrates': 'substrates',
  'osat': 'osat',
}

async function ensureSegmentsExist() {
  // Get semiconductor industry ID
  const { data: industry } = await supabase
    .from('industries')
    .select('id')
    .eq('slug', 'semiconductors')
    .single()
  
  if (!industry) {
    console.error('Semiconductors industry not found!')
    return
  }

  // Add missing segments
  const newSegments = [
    { name: 'Fabless', slug: 'fabless', description: 'Chip designers without manufacturing', industry_id: industry.id, display_order: 7 },
    { name: 'Testing & Metrology', slug: 'testing', description: 'Chip testing and measurement equipment', industry_id: industry.id, display_order: 8 },
  ]

  for (const seg of newSegments) {
    const { error } = await supabase
      .from('segments')
      .upsert(seg, { onConflict: 'slug' })
    
    if (error) {
      console.error(`Error adding segment ${seg.slug}:`, error.message)
    } else {
      console.log(`✓ Segment: ${seg.name}`)
    }
  }

  // Give demo org access to new segments
  const { data: demoOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'demo-eda')
    .single()

  if (demoOrg) {
    const { data: segments } = await supabase
      .from('segments')
      .select('id')
      .in('slug', ['fabless', 'testing'])
    
    for (const seg of segments || []) {
      await supabase
        .from('organization_segments')
        .upsert({ organization_id: demoOrg.id, segment_id: seg.id }, { onConflict: 'organization_id,segment_id' })
    }
    console.log('✓ Demo org access granted')
  }
}

async function importCompanies(csvPath: string) {
  console.log(`\nImporting from: ${csvPath}\n`)
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`Found ${records.length} companies\n`)

  // Get segment ID mapping
  const { data: segments } = await supabase.from('segments').select('id, slug')
  const segmentIdMap: Record<string, string> = {}
  segments?.forEach(s => { segmentIdMap[s.slug] = s.id })

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const row of records) {
    // Skip rows with bad data
    if (!row.name || !row.slug || row.slug === '1999') {
      console.log(`⚠ Skipping invalid row: ${row.name || 'no name'}`)
      skipped++
      continue
    }

    // Map segment slug
    const mappedSegmentSlug = SEGMENT_SLUG_MAP[row.segment_slug] || row.segment_slug
    const segmentId = segmentIdMap[mappedSegmentSlug]

    if (!segmentId) {
      console.log(`⚠ Unknown segment '${row.segment_slug}' for ${row.name}`)
      skipped++
      continue
    }

    // Prepare company data
    const company = {
      name: row.name,
      slug: row.slug,
      website: row.website || null,
      hq_city: row.hq_city || null,
      hq_state: row.hq_state || null,
      country: row.country || null,
      employee_count: row.employee_count ? parseInt(row.employee_count) : null,
      founded_year: row.founded_year ? parseInt(row.founded_year) : null,
      ownership: row.ownership || null,
      ticker: row.ticker || null,
      sub_segment: row.sub_segment || null,
      composite_score: row.composite_score ? parseFloat(row.composite_score) : 5,
      messaging_hook: row.messaging_hook || null,
      notes: row.notes || null,
      linkedin_url: row.linkedin_url || null,
      naics_code: row.naics_code || null,
    }

    // Upsert company
    const { data: upsertedCompany, error } = await supabase
      .from('companies')
      .upsert(company, { onConflict: 'slug' })
      .select('id')
      .single()

    if (error) {
      console.log(`✗ ${row.name}: ${error.message}`)
      errors++
      continue
    }

    // Link company to segment
    await supabase
      .from('company_segments')
      .upsert({
        company_id: upsertedCompany.id,
        segment_id: segmentId,
        is_primary: true,
      }, { onConflict: 'company_id,segment_id' })

    console.log(`✓ ${row.name} → ${mappedSegmentSlug}`)
    imported++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Imported: ${imported}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

async function main() {
  const csvPath = process.argv[2]
  
  if (!csvPath) {
    console.log('Usage: npx tsx scripts/import-companies.ts <csv-file>')
    process.exit(1)
  }

  console.log('Setting up segments...')
  await ensureSegmentsExist()
  
  await importCompanies(csvPath)
}

main().catch(console.error)
