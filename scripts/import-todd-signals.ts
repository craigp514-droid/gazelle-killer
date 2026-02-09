/**
 * Import Todd's signal files into the signals table
 * Matches companies by name and creates signals
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

function inferSignalType(signal: string): string {
  const s = signal.toLowerCase()
  
  if (s.includes('site search') || s.includes('site selection') || s.includes('location tbd')) {
    return 'site_search'
  }
  if (s.includes('series a') || s.includes('series b') || s.includes('series c') || s.includes('series d') || s.includes('funding') || s.includes('raised') || s.includes('investment')) {
    return 'funding_round'
  }
  if (s.includes('facility') || s.includes('fab') || s.includes('plant') || s.includes('factory') || s.includes('campus') || s.includes('manufacturing')) {
    return 'new_facility'
  }
  if (s.includes('chips act') || s.includes('chips award') || s.includes('doe') || s.includes('grant')) {
    return 'chips_award'
  }
  if (s.includes('acquisition') || s.includes('acquired') || s.includes('acquire')) {
    return 'acquisition'
  }
  if (s.includes('contract') || s.includes('awarded')) {
    return 'contract_award'
  }
  if (s.includes('partnership') || s.includes('partner') || s.includes('alliance') || s.includes('joint venture')) {
    return 'partnership'
  }
  if (s.includes('ipo') || s.includes('public')) {
    return 'regulatory_approval'
  }
  if (s.includes('expansion') || s.includes('expand')) {
    return 'facility_expansion'
  }
  
  return 'facility_announced'
}

function parseSignalDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  
  // Handle formats like "2025-03", "Dec 2025", "Q4 2024", etc.
  const str = dateStr.trim()
  
  // YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(str)) {
    return `${str}-01`
  }
  
  // Month Year format (e.g., "Dec 2025")
  const monthYearMatch = str.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})$/i)
  if (monthYearMatch) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    }
    const month = months[monthYearMatch[1].toLowerCase()]
    return `${monthYearMatch[2]}-${month}-01`
  }
  
  // Quarter format (e.g., "Q4 2024")
  const quarterMatch = str.match(/^Q(\d)\s*(\d{4})$/i)
  if (quarterMatch) {
    const quarterMonths: Record<string, string> = { '1': '01', '2': '04', '3': '07', '4': '10' }
    return `${quarterMatch[2]}-${quarterMonths[quarterMatch[1]]}-01`
  }
  
  // Just year
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`
  }
  
  // Try parsing as date
  try {
    const d = new Date(str)
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0]
    }
  } catch {}
  
  return new Date().toISOString().split('T')[0]
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function importSignals(csvPath: string) {
  console.log(`\nImporting signals from: ${csvPath}\n`)
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  })

  console.log(`Found ${records.length} records\n`)

  // Get all companies for matching
  const { data: companies } = await supabase.from('companies').select('id, slug, name')
  
  // Build lookup maps
  const companyBySlug: Record<string, any> = {}
  const companyByName: Record<string, any> = {}
  companies?.forEach(c => {
    companyBySlug[c.slug] = c
    companyByName[c.name.toLowerCase()] = c
  })

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const row of records as Record<string, string>[]) {
    const companyName = row.Company || row.company
    const signalText = row.Signal || row.signal
    const signalDate = row['Signal Date'] || row.signal_date
    const score = row.Score || row.score
    const sourceUrl = row['Source URL'] || row.source_url
    
    if (!companyName || !signalText) {
      skipped++
      continue
    }

    // Find company
    const slug = slugify(companyName)
    let company = companyBySlug[slug] || companyByName[companyName.toLowerCase()]
    
    if (!company) {
      console.log(`⚠ Company not found: ${companyName}`)
      skipped++
      continue
    }

    // Infer signal type from content
    const signalType = inferSignalType(signalText)
    
    // Parse date
    const parsedDate = parseSignalDate(signalDate)
    
    // Check for duplicate (same company + type + date)
    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('company_id', company.id)
      .eq('signal_type', signalType)
      .eq('signal_date', parsedDate)
      .single()

    if (existing) {
      console.log(`↻ Already exists: ${companyName} - ${signalType}`)
      skipped++
      continue
    }

    // Create signal
    const signal = {
      company_id: company.id,
      signal_type: signalType,
      title: signalText.substring(0, 200),
      description: signalText.length > 200 ? signalText : null,
      signal_date: parsedDate,
      signal_strength: score ? parseInt(score) : 7,
      source_url: sourceUrl || null,
      status: 'active',
    }

    const { error } = await supabase.from('signals').insert(signal)

    if (error) {
      console.log(`✗ ${companyName}: ${error.message}`)
      errors++
      continue
    }

    console.log(`✓ ${companyName}: ${signalType} (${parsedDate})`)
    imported++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Imported: ${imported}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

async function main() {
  const files = [
    'data-imports/todd-signals/expansion-signals-export-2026-02-08.csv',
    'data-imports/todd-signals/announced-expansions-2026-02-08.csv',
  ]
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      await importSignals(file)
    } else {
      console.log(`File not found: ${file}`)
    }
  }
}

main().catch(console.error)
