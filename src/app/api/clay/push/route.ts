import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CLAY_WEBHOOK_URL = process.env.CLAY_WEBHOOK_URL!
const CLAY_API_KEY = process.env.CLAY_API_KEY!

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CompanyToPush {
  id: string
  name: string
  website: string
}

interface ClayPayload {
  company_name: string
  website: string
}

async function pushToClay(companies: CompanyToPush[]): Promise<{ 
  success: boolean
  pushed: number
  pushedIds: string[]
  errors: string[] 
}> {
  const errors: string[] = []
  const pushedIds: string[] = []

  for (const company of companies) {
    try {
      const payload: ClayPayload = {
        company_name: company.name,
        website: company.website,
      }

      const response = await fetch(CLAY_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clay-webhook-auth': CLAY_API_KEY,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        errors.push(`Failed to push ${company.name}: ${response.status} - ${errorText}`)
      } else {
        pushedIds.push(company.id)
      }
    } catch (error) {
      errors.push(`Error pushing ${company.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    pushed: pushedIds.length,
    pushedIds,
    errors,
  }
}

async function updateLastEnrichedAt(companyIds: string[]): Promise<void> {
  if (companyIds.length === 0) return

  const { error } = await supabase
    .from('companies')
    .update({ last_enriched_at: new Date().toISOString() })
    .in('id', companyIds)

  if (error) {
    console.error('Failed to update last_enriched_at:', error)
  }
}

// POST /api/clay/push
// Body options:
//   { companyIds: string[] } - Push specific companies by ID
//   { companies: { company_name, website }[] } - Push arbitrary companies (no tracking)
//   { pushNew: true } - Push all companies never enriched (last_enriched_at IS NULL)
//   { pushAll: true } - Push all companies with websites (re-enriches everything)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let companiesToPush: CompanyToPush[] = []
    let trackEnrichment = true // Whether to update last_enriched_at

    // Option 1: Push specific companies by ID
    if (body.companyIds && Array.isArray(body.companyIds)) {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, website')
        .in('id', body.companyIds)
        .not('website', 'is', null)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch companies', details: error.message }, { status: 500 })
      }

      companiesToPush = companies.filter((c) => c.website) as CompanyToPush[]
    }
    // Option 2: Push arbitrary companies directly (no tracking)
    else if (body.companies && Array.isArray(body.companies)) {
      trackEnrichment = false // Can't track these - no IDs
      companiesToPush = body.companies
        .filter((c: any) => c.company_name && c.website)
        .map((c: any) => ({
          id: '',
          name: c.company_name,
          website: c.website,
        }))
    }
    // Option 3: Push NEW companies (never enriched) - DEFAULT for daily cron
    else if (body.pushNew) {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, website')
        .not('website', 'is', null)
        .is('last_enriched_at', null)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch companies', details: error.message }, { status: 500 })
      }

      companiesToPush = companies.filter((c) => c.website) as CompanyToPush[]
    }
    // Option 4: Push ALL companies (re-enrich everything)
    else if (body.pushAll) {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, website')
        .not('website', 'is', null)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch companies', details: error.message }, { status: 500 })
      }

      companiesToPush = companies.filter((c) => c.website) as CompanyToPush[]
    } 
    else {
      return NextResponse.json(
        { error: 'Invalid request. Provide companyIds, companies, pushNew: true, or pushAll: true' },
        { status: 400 }
      )
    }

    if (companiesToPush.length === 0) {
      return NextResponse.json({ message: 'No companies to push', pushed: 0 })
    }

    const result = await pushToClay(companiesToPush)

    // Update last_enriched_at for successfully pushed companies
    if (trackEnrichment && result.pushedIds.length > 0) {
      await updateLastEnrichedAt(result.pushedIds)
    }

    return NextResponse.json({
      message: result.success ? 'All companies pushed successfully' : 'Some companies failed to push',
      pushed: result.pushed,
      errors: result.errors,
      tracked: trackEnrichment,
    })
  } catch (error) {
    console.error('Clay push error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET /api/clay/push - Status endpoint
export async function GET() {
  // Count companies needing enrichment
  const { count: newCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .not('website', 'is', null)
    .is('last_enriched_at', null)

  const { count: totalCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .not('website', 'is', null)

  return NextResponse.json({
    status: 'ok',
    message: 'Clay push endpoint ready',
    webhookConfigured: !!CLAY_WEBHOOK_URL,
    apiKeyConfigured: !!CLAY_API_KEY,
    stats: {
      companiesNeedingEnrichment: newCount || 0,
      totalCompaniesWithWebsite: totalCount || 0,
    }
  })
}
