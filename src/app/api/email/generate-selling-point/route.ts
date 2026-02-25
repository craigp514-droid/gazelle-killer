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

  const { keyword, company } = await request.json()

  // Get user's org info
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_type, org_name, org_region, org_value_props')
    .eq('id', user.id)
    .single()

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const orgContext = profile?.org_type === 'edo' 
    ? `an Economic Development Organization in ${profile.org_region || 'the region'}`
    : `a site selection consultant`

  const prompt = `Write ONE short sentence about "${keyword}" for a cold email from ${orgContext}.

Context: The email is to ${company.name} (${company.industry || 'a company'}).
The user wants to mention "${keyword}" as a selling point.

Requirements:
- ONE sentence, under 20 words
- Mention the keyword naturally
- Be specific, not generic
- Sound helpful, not salesy
- Use "we" or "our region" appropriately

Examples based on different keywords:
- "incentives" → "We have some competitive incentive programs that might be relevant to your timeline."
- "talent" → "Our region has a strong pipeline of engineering talent from three nearby universities."
- "proximity" → "We're within a day's drive of 60% of the US population."
- "speed" → "Our permitting process typically moves faster than most — happy to share specifics."

Write only the sentence, nothing else.`

  // Retry logic for overloaded errors
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })

      return NextResponse.json({
        content: (message.content[0] as any).text.trim()
      })
    } catch (error: any) {
      console.error(`Generate selling point error (attempt ${attempt}):`, error)
      
      // If overloaded, wait and retry
      if (error?.status === 529 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
        continue
      }
      
      // Friendly error message
      if (error?.status === 529) {
        return NextResponse.json({ error: 'AI is busy — please try again in a moment' }, { status: 503 })
      }
      
      return NextResponse.json({ error: error.message || 'Failed to generate' }, { status: 500 })
    }
  }
}
