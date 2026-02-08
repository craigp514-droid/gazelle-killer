/**
 * Import signals from CSV to Supabase
 * Usage: npx tsx scripts/import-signals.ts data-imports/semiconductor-signals-initial.csv
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

// Map signal types to our DB types
const SIGNAL_TYPE_MAP: Record<string, string> = {
  'facility_expansion': 'new_facility',
  'rd_investment': 'partnership',
  'funding_round': 'funding_round',
  'acquisition': 'acquisition',
  'leadership_change': 'hiring_surge',
  'contract_win': 'contract_award',
  'earnings_signal': 'funding_round',
  'policy_tailwind': 'regulatory_approval',
  'hiring_signal': 'hiring_surge',
}

async function importSignals(csvPath: string) {
  console.log(`\nImporting signals from: ${csvPath}\n`)
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`Found ${records.length} signals\n`)

  // Get company slug -> id mapping
  const { data: companies } = await supabase.from('companies').select('id, slug')
  const companyIdMap: Record<string, string> = {}
  companies?.forEach(c => { companyIdMap[c.slug] = c.id })

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const row of records as Record<string, string>[]) {
    // Skip rows with bad data
    if (!row.company_slug || !row.signal_type || !row.title) {
      console.log(`⚠ Skipping invalid row: ${row.title || 'no title'}`)
      skipped++
      continue
    }

    const companyId = companyIdMap[row.company_slug]
    if (!companyId) {
      console.log(`⚠ Unknown company '${row.company_slug}' for signal: ${row.title}`)
      skipped++
      continue
    }

    // Map signal type
    const mappedType = SIGNAL_TYPE_MAP[row.signal_type] || row.signal_type

    // Calculate strength from urgency
    const strength = row.urgency === 'type_1' ? 10 : row.urgency === 'type_2' ? 8 : 5

    // Prepare signal data
    const signal = {
      company_id: companyId,
      signal_type: mappedType,
      title: row.title,
      description: row.description || null,
      source_url: row.source_url || null,
      signal_date: row.signal_date || new Date().toISOString().split('T')[0],
    }

    // Insert signal
    const { error } = await supabase.from('signals').insert(signal)

    if (error) {
      // Check if duplicate
      if (error.code === '23505') {
        console.log(`⚠ Duplicate: ${row.title.substring(0, 50)}...`)
        skipped++
      } else {
        console.log(`✗ ${row.title}: ${error.message}`)
        errors++
      }
      continue
    }

    console.log(`✓ ${row.company_slug}: ${row.title.substring(0, 50)}...`)
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
    console.log('Usage: npx tsx scripts/import-signals.ts <csv-file>')
    process.exit(1)
  }

  await importSignals(csvPath)
}

main().catch(console.error)
