/**
 * Apply Clay enrichment data to existing companies
 * Updates: linkedin_description, employee_range, linkedin_url, etc.
 * 
 * Usage: npx tsx scripts/apply-clay-enrichment.ts <csv-file>
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

function normalizeWebsite(url: string | null): string {
  if (!url) return ''
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .split('/')[0]
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  try {
    return new Date(dateStr)
  } catch {
    return null
  }
}

function isStaleRefresh(lastRefresh: string | null): boolean {
  const date = parseDate(lastRefresh)
  if (!date) return false
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)
  return date < threeYearsAgo
}

async function applyEnrichment(csvPath: string) {
  console.log(`\nApplying Clay enrichment from: ${csvPath}\n`)
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  })

  console.log(`Found ${records.length} enrichment records\n`)

  // Get all companies from DB
  const { data: companies } = await supabase.from('companies').select('id, slug, name, website')
  
  // Build lookup by normalized website
  const companyByWebsite: Record<string, any> = {}
  const companyByName: Record<string, any> = {}
  companies?.forEach(c => {
    const normalizedWeb = normalizeWebsite(c.website)
    if (normalizedWeb) companyByWebsite[normalizedWeb] = c
    companyByName[c.name.toLowerCase()] = c
  })

  let updated = 0
  let notFound = 0
  let noEnrichment = 0
  let staleData = 0
  const issues: string[] = []

  for (const row of records as Record<string, string>[]) {
    const originalName = row.company_name || row['Company']
    const originalWebsite = row.website || row['Website']
    
    // Clay enrichment fields
    const enrichedName = row['Name']
    const enrichedWebsite = row['Website'] // This is the LinkedIn website
    const employeeCount = row['Employee Count']
    const employeeRange = row['Size']
    const description = row['Description']
    const linkedinUrl = row['Url']
    const companyType = row['Type']
    const country = row['Country']
    const founded = row['Founded']
    const locality = row['Locality']
    const lastRefresh = row['Last Refresh']
    
    // Check if enrichment failed
    if (!enrichedName && !description) {
      issues.push(`NO_ENRICHMENT: ${originalName} (${originalWebsite})`)
      noEnrichment++
      continue
    }
    
    // Find matching company in our DB
    const normalizedOriginal = normalizeWebsite(originalWebsite)
    let company = companyByWebsite[normalizedOriginal]
    
    // Try LinkedIn website if original didn't match
    if (!company && enrichedWebsite) {
      const normalizedEnriched = normalizeWebsite(enrichedWebsite)
      company = companyByWebsite[normalizedEnriched]
    }
    
    // Try by name as fallback
    if (!company && originalName) {
      company = companyByName[originalName.toLowerCase()]
    }
    
    if (!company) {
      issues.push(`NOT_FOUND: ${originalName} (${originalWebsite})`)
      notFound++
      continue
    }
    
    // Check for stale data
    if (isStaleRefresh(lastRefresh)) {
      issues.push(`STALE_DATA: ${originalName} - Last refresh: ${lastRefresh}`)
      staleData++
    }
    
    // Build update object
    const update: Record<string, any> = {}
    
    if (description) {
      update.linkedin_description = description
    }
    
    if (employeeRange) {
      update.employee_range = employeeRange
    }
    
    if (linkedinUrl) {
      update.linkedin_url = linkedinUrl
    }
    
    if (companyType) {
      update.ownership = companyType
    }
    
    if (country && !company.country) {
      update.country = country
    }
    
    if (locality) {
      // Only update if we don't have HQ info
      if (!company.hq_city) {
        update.hq_city = locality
      }
    }
    
    if (founded && !company.founded_year) {
      const yearMatch = founded.match(/\d{4}/)
      if (yearMatch) {
        update.founded_year = parseInt(yearMatch[0])
      }
    }
    
    // Apply update if we have changes
    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from('companies')
        .update(update)
        .eq('id', company.id)
      
      if (error) {
        console.log(`✗ ${originalName}: ${error.message}`)
      } else {
        console.log(`✓ ${originalName}`)
        updated++
      }
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`Updated: ${updated}`)
  console.log(`Not found in DB: ${notFound}`)
  console.log(`No enrichment data: ${noEnrichment}`)
  console.log(`Stale data (3+ years): ${staleData}`)
  
  if (issues.length > 0) {
    console.log(`\n--- Issues (${issues.length}) ---`)
    // Group by type
    const noEnrichList = issues.filter(i => i.startsWith('NO_ENRICHMENT'))
    const notFoundList = issues.filter(i => i.startsWith('NOT_FOUND'))
    const staleList = issues.filter(i => i.startsWith('STALE_DATA'))
    
    if (noEnrichList.length > 0) {
      console.log(`\nNo Enrichment (${noEnrichList.length}):`)
      noEnrichList.slice(0, 10).forEach(i => console.log('  ' + i))
      if (noEnrichList.length > 10) console.log(`  ... and ${noEnrichList.length - 10} more`)
    }
    
    if (notFoundList.length > 0) {
      console.log(`\nNot Found in DB (${notFoundList.length}):`)
      notFoundList.slice(0, 10).forEach(i => console.log('  ' + i))
      if (notFoundList.length > 10) console.log(`  ... and ${notFoundList.length - 10} more`)
    }
    
    if (staleList.length > 0) {
      console.log(`\nStale Data (${staleList.length}):`)
      staleList.slice(0, 10).forEach(i => console.log('  ' + i))
      if (staleList.length > 10) console.log(`  ... and ${staleList.length - 10} more`)
    }
    
    // Save full issues list to file
    fs.writeFileSync('data-imports/enrichment-issues.txt', issues.join('\n'))
    console.log(`\nFull issues list saved to: data-imports/enrichment-issues.txt`)
  }
}

async function main() {
  const csvPath = process.argv[2]
  
  if (!csvPath) {
    console.log('Usage: npx tsx scripts/apply-clay-enrichment.ts <csv-file>')
    process.exit(1)
  }

  // First, ensure we have the employee_range column
  console.log('Checking database schema...')
  
  await applyEnrichment(csvPath)
}

main().catch(console.error)
