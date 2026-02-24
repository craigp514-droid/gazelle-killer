import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const { company, signals } = await request.json()

  // Get user's org info for context
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_type, org_name, org_region, org_value_props')
    .eq('id', user.id)
    .single()

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // Build company context
  const companyInfo = `
Company: ${company.name}
Industry: ${company.industry || 'Unknown'}
HQ: ${company.hq_state || 'Unknown'}
${company.linkedin_description ? `About: ${company.linkedin_description.slice(0, 400)}` : ''}
${company.messaging_hook ? `Key angle: ${company.messaging_hook}` : ''}

Recent signals:
${signals?.slice(0, 3).map((s: any) => `- ${s.signal_type}: ${s.title}`).join('\n') || 'No recent signals'}
`.trim()

  // Build org context based on type
  let orgContext = ''
  if (profile?.org_type === 'edo') {
    orgContext = `
You are writing for an Economic Development Organization.
Org: ${profile.org_name || 'an EDO'}
Region: ${profile.org_region || 'their region'}
Value props: ${profile.org_value_props || 'competitive incentives, workforce, location'}

Focus: Why this company should consider locating/expanding in this region.
`.trim()
  } else if (profile?.org_type === 'service_provider') {
    orgContext = `
You are writing for a site selection consultant/service provider.
Firm: ${profile.org_name || 'a consulting firm'}
Services: ${profile.org_value_props || 'site selection, incentive negotiation, real estate advisory'}

Focus: How your services can help this company with their expansion/location decisions.
`.trim()
  } else {
    orgContext = `Focus: Connect the company's signals to relevant opportunities or services.`
  }

  const prompt = `Write a SHORT context/value paragraph (2-3 sentences, under 50 words) for a cold email.

${orgContext}

Company context:
${companyInfo}

Requirements:
- Reference a specific signal or company detail
- Connect it to what you offer
- Be specific, not generic
- Sound human, use contractions
- NO fluff or filler phrases
- Under 50 words

Write only the paragraph, nothing else.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })

    return NextResponse.json({
      content: (message.content[0] as any).text.trim()
    })
  } catch (error: any) {
    console.error('Generate context error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
