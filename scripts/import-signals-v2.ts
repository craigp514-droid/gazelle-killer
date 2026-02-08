/**
 * Import signals from CSV to Supabase (v2 - Enhanced Schema)
 * Supports Todd's multi-signal format with tiers, sources, and status
 * 
 * Usage: npx tsx scripts/import-signals-v2.ts <csv-file>
 * 
 * Expected CSV columns:
 * company_slug, signal_type, signal_tier, headline, details, score, signal_date,
 * source_type, source_url, source_2_type, source_2_url, status
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

// Signal type taxonomy with default tiers
const SIGNAL_TAXONOMY: Record<string, { tier: number; defaultScore: number }> = {
  // Tier 1 - GOLD (Location TBD)
  'site_search': { tier: 1, defaultScore: 10 },
  'site_selection_consultant': { tier: 1, defaultScore: 9 },
  
  // Tier 2 - Expansion Signals
  'capacity_constrained': { tier: 2, defaultScore: 9 },
  'evaluating_expansion': { tier: 2, defaultScore: 8 },
  
  // Tier 3 - Major Financial
  'major_funding': { tier: 3, defaultScore: 8 },
  'funding_round': { tier: 3, defaultScore: 7 },
  'pe_acquisition': { tier: 3, defaultScore: 7 },
  'chips_award': { tier: 3, defaultScore: 8 },
  
  // Tier 4 - Corporate Changes
  'new_ceo': { tier: 4, defaultScore: 7 },
  'major_contract': { tier: 4, defaultScore: 7 },
  'contract_award': { tier: 4, defaultScore: 7 },
  
  // Tier 5 - Job Postings (Leading Indicators)
  'job_posting_site_selection': { tier: 5, defaultScore: 8 },
  'job_posting_real_estate': { tier: 5, defaultScore: 7 },
  'job_posting_ops': { tier: 5, defaultScore: 6 },
  'hiring_surge': { tier: 5, defaultScore: 6 },
  
  // Tier 6 - Announced/Completed (Informational)
  'facility_announced': { tier: 6, defaultScore: 6 },
  'new_facility': { tier: 6, defaultScore: 6 },
  'facility_opened': { tier: 6, defaultScore: 5 },
  'facility_expansion': { tier: 6, defaultScore: 6 },
  'acquisition': { tier: 6, defaultScore: 6 },
  'partnership': { tier: 6, defaultScore: 5 },
  'regulatory_approval': { tier: 6, defaultScore: 5 },
}

async function importSignals(csvPath: string) {
  console.log(`\nImporting signals from: ${csvPath}\n`)
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  })

  console.log(`Found ${records.length} signals\n`)

  // Get company slug -> id mapping
  const { data: companies } = await supabase.from('companies').select('id, slug')
  const companyIdMap: Record<string, string> = {}
  companies?.forEach(c => { companyIdMap[c.slug] = c.id })

  let imported = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const row of records as Record<string, string>[]) {
    // Handle both 'company_slug' and 'company_id' column names
    const companySlug = row.company_slug || row.company_id
    const signalType = row.signal_type
    const headline = row.headline || row.title
    
    // Skip rows with missing required data
    if (!companySlug || !signalType || !headline) {
      console.log(`⚠ Skipping invalid row: missing required fields`)
      skipped++
      continue
    }

    const companyId = companyIdMap[companySlug]
    if (!companyId) {
      console.log(`⚠ Unknown company '${companySlug}' for signal: ${headline}`)
      skipped++
      continue
    }

    // Get taxonomy info for this signal type
    const taxonomy = SIGNAL_TAXONOMY[signalType] || { tier: 6, defaultScore: 5 }
    
    // Parse score (use provided score, or default from taxonomy)
    const score = row.score ? parseInt(row.score) : taxonomy.defaultScore
    
    // Parse tier (use provided tier, or default from taxonomy)
    const signalTier = row.signal_tier ? parseInt(row.signal_tier) : taxonomy.tier

    // Prepare signal data
    const signal = {
      company_id: companyId,
      signal_type: signalType,
      signal_tier: signalTier,
      title: headline,
      description: row.details || row.description || null,
      source_url: row.source_url || row.source_1_url || null,
      source_type: row.source_type || row.source_1_type || null,
      source_2_url: row.source_2_url || null,
      source_2_type: row.source_2_type || null,
      signal_date: row.signal_date || new Date().toISOString().split('T')[0],
      discovered_date: row.discovered_date || new Date().toISOString().split('T')[0],
      expiry_date: row.expiry_date || null,
      status: row.status || 'active',
      strength: score,
    }

    // Check for existing signal (same company + type + date)
    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('company_id', companyId)
      .eq('signal_type', signalType)
      .eq('signal_date', signal.signal_date)
      .single()

    if (existing) {
      // Update existing signal
      const { error } = await supabase
        .from('signals')
        .update(signal)
        .eq('id', existing.id)
      
      if (error) {
        console.log(`✗ Update failed for ${headline}: ${error.message}`)
        errors++
      } else {
        console.log(`↻ Updated: ${companySlug}: ${headline.substring(0, 50)}...`)
        updated++
      }
    } else {
      // Insert new signal
      const { error } = await supabase.from('signals').insert(signal)

      if (error) {
        console.log(`✗ ${headline}: ${error.message}`)
        errors++
        continue
      }

      console.log(`✓ ${companySlug}: ${headline.substring(0, 50)}...`)
      imported++
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`Imported: ${imported}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

async function main() {
  const csvPath = process.argv[2]
  
  if (!csvPath) {
    console.log('Usage: npx tsx scripts/import-signals-v2.ts <csv-file>')
    console.log('')
    console.log('Expected CSV columns:')
    console.log('  company_slug, signal_type, signal_tier, headline, details,')
    console.log('  score, signal_date, source_type, source_url,')
    console.log('  source_2_type, source_2_url, status')
    process.exit(1)
  }

  await importSignals(csvPath)
}

main().catch(console.error)
