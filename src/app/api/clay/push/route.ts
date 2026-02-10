import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CLAY_WEBHOOK_URL = process.env.CLAY_WEBHOOK_URL!
const CLAY_API_KEY = process.env.CLAY_API_KEY!

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ClayPayload {
  company_name: string
  website: string
}

async function pushToClay(companies: ClayPayload[]): Promise<{ success: boolean; pushed: number; errors: string[] }> {
  const errors: string[] = []
  let pushed = 0

  for (const company of companies) {
    try {
      const response = await fetch(CLAY_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clay-webhook-auth': CLAY_API_KEY,
        },
        body: JSON.stringify(company),
      })

      if (!response.ok) {
        const errorText = await response.text()
        errors.push(`Failed to push ${company.company_name}: ${response.status} - ${errorText}`)
      } else {
        pushed++
      }
    } catch (error) {
      errors.push(`Error pushing ${company.company_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    pushed,
    errors,
  }
}

// POST /api/clay/push
// Body: { companyIds: string[] } or { companies: { company_name: string, website: string }[] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let companiesToPush: ClayPayload[] = []

    // Option 1: Pass company IDs to look up from database
    if (body.companyIds && Array.isArray(body.companyIds)) {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('name, website')
        .in('id', body.companyIds)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch companies', details: error.message }, { status: 500 })
      }

      companiesToPush = companies
        .filter((c) => c.website) // Only push companies with websites
        .map((c) => ({
          company_name: c.name,
          website: c.website!,
        }))
    }
    // Option 2: Pass companies directly
    else if (body.companies && Array.isArray(body.companies)) {
      companiesToPush = body.companies.filter(
        (c: any) => c.company_name && c.website
      )
    }
    // Option 3: Push all companies needing enrichment
    else if (body.pushAll) {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('name, website')
        .not('website', 'is', null)
        .or('linkedin_url.is.null,employee_count.is.null') // Missing enrichment data

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch companies', details: error.message }, { status: 500 })
      }

      companiesToPush = companies.map((c) => ({
        company_name: c.name,
        website: c.website!,
      }))
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Provide companyIds, companies, or pushAll: true' },
        { status: 400 }
      )
    }

    if (companiesToPush.length === 0) {
      return NextResponse.json({ message: 'No companies to push', pushed: 0 })
    }

    const result = await pushToClay(companiesToPush)

    return NextResponse.json({
      message: result.success ? 'All companies pushed successfully' : 'Some companies failed to push',
      ...result,
    })
  } catch (error) {
    console.error('Clay push error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET /api/clay/push - Test endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Clay push endpoint ready',
    webhookConfigured: !!CLAY_WEBHOOK_URL,
    apiKeyConfigured: !!CLAY_API_KEY,
  })
}
