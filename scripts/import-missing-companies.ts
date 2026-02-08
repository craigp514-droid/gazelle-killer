/**
 * Import companies that were in Clay enrichment but not in our DB
 * Creates companies with all available data including LinkedIn enrichment
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

// Map industry names to segment slugs
const INDUSTRY_TO_SEGMENT: Record<string, string> = {
  'Semiconductors': 'fabless',
  'Battery': 'ev-battery',
  'Robotics': 'robotics-automation',
  'Space': 'space-tech',
  'Aerospace': 'launch-services',
  'Defense': 'defense-tech',
  'Rare Earth': 'advanced-materials',
  'Grid/Transmission': 'grid-storage',
  'Solar': 'clean-energy',
  'Hydrogen': 'hydrogen-fuel-cells',
  'SMR Nuclear': 'clean-energy',
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeWebsite(url: string): string {
  if (!url) return ''
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
}

async function importMissingCompanies() {
  // Read issues file to get list of not found companies
  const issues = fs.readFileSync('data-imports/enrichment-issues.txt', 'utf-8').split('\n')
  const notFoundWebsites = new Set(
    issues
      .filter(i => i.startsWith('NOT_FOUND:'))
      .map(i => {
        const match = i.match(/NOT_FOUND: .+ \((.+)\)/)
        return match ? normalizeWebsite(match[1]) : null
      })
      .filter(Boolean)
  )

  console.log(`Found ${notFoundWebsites.size} missing companies to import\n`)

  // Read Clay enrichment to get full data
  const csv = fs.readFileSync('data-imports/clay-enriched-from-craig.csv', 'utf-8')
  const records = parse(csv, { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true,
    relax_column_count: true,
  })

  // Get segment IDs
  const { data: segments } = await supabase.from('segments').select('id, slug')
  const segmentIdMap: Record<string, string> = {}
  segments?.forEach(s => { segmentIdMap[s.slug] = s.id })

  // Get existing company websites to avoid duplicates
  const { data: existingCompanies } = await supabase.from('companies').select('website')
  const existingWebsites = new Set(
    existingCompanies?.map(c => normalizeWebsite(c.website || '')) || []
  )

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const row of records as Record<string, string>[]) {
    const website = normalizeWebsite(row.website || '')
    
    // Only import if it was in our not-found list
    if (!notFoundWebsites.has(website)) continue
    
    // Skip if somehow already exists
    if (existingWebsites.has(website)) {
      skipped++
      continue
    }

    const name = row.company_name
    const industry = row.industry
    const slug = slugify(name)
    
    // Get segment for this industry
    const segmentSlug = INDUSTRY_TO_SEGMENT[industry]
    const segmentId = segmentSlug ? segmentIdMap[segmentSlug] : null

    if (!segmentId) {
      console.log(`⚠ No segment mapping for industry '${industry}': ${name}`)
      // Still import, just without segment link
    }

    // Build company record (tier is auto-computed from score)
    const company = {
      name,
      slug,
      website: row.website || null,
      hq_city: row['Locality'] || null,
      country: row['Country'] || null,
      employee_range: row['Size'] || null,
      employee_count: row['Employee Count'] ? parseInt(row['Employee Count']) : null,
      ownership: row['Type'] || null,
      linkedin_url: row['Url'] || null,
      linkedin_description: row['Description'] || null,
      composite_score: 5, // Default score (tier auto-computed)
    }

    // Insert company
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert(company)
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        console.log(`⚠ Duplicate: ${name}`)
        skipped++
      } else {
        console.log(`✗ ${name}: ${error.message}`)
        errors++
      }
      continue
    }

    // Link to segment if we have one
    if (segmentId && newCompany) {
      await supabase
        .from('company_segments')
        .insert({
          company_id: newCompany.id,
          segment_id: segmentId,
          is_primary: true,
        })
    }

    console.log(`✓ ${name} → ${industry}`)
    imported++
    existingWebsites.add(website) // Track to avoid duplicates within this run
  }

  console.log(`\n--- Summary ---`)
  console.log(`Imported: ${imported}`)
  console.log(`Skipped (duplicate): ${skipped}`)
  console.log(`Errors: ${errors}`)
}

importMissingCompanies().catch(console.error)
