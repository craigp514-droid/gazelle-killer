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

  const body = await request.json()
  let { type, orgType, orgName, orgRegion } = body

  // If org info not provided, fetch from profile
  if (!orgType || !orgName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_type, org_name, org_region')
      .eq('id', user.id)
      .single()
    
    orgType = orgType || profile?.org_type
    orgName = orgName || profile?.org_name
    orgRegion = orgRegion || profile?.org_region
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  let prompt = ''
  
  if (type === 'intro') {
    if (orgType === 'edo') {
      prompt = `Write a short, professional intro paragraph (2-3 sentences) for a cold email from an economic development professional at "${orgName || 'an EDO'}" in ${orgRegion || 'their region'}.

The intro should:
- Be warm but professional
- Mention they came across the company
- NOT mention specific company details (that comes in paragraph 2)
- Be under 40 words

Example tone: "Hi [Name], I'm [Your Name] with [Org]. I came across [Company] while researching [industry] expansions and wanted to reach out."

Write only the intro paragraph, nothing else.`
    } else {
      prompt = `Write a short, professional intro paragraph (2-3 sentences) for a cold email from a site selection consultant or service provider at "${orgName || 'a consulting firm'}".

The intro should:
- Be warm but professional  
- Position them as a helpful resource
- NOT mention specific company details (that comes in paragraph 2)
- Be under 40 words

Example tone: "Hi [Name], I'm [Your Name] with [Firm]. We help companies navigate site selection and expansion decisions, and I noticed [Company] might be exploring new locations."

Write only the intro paragraph, nothing else.`
    }
  } else if (type === 'close') {
    prompt = `Write a short, low-pressure closing paragraph (1-2 sentences) for a cold email.

The close should:
- Ask for a brief call or meeting
- Be friendly, not pushy
- Be under 25 words

Examples:
- "Worth a 15-minute call to explore?"
- "Happy to share more if helpful — would a quick call work?"
- "Open to a brief chat? I can work around your schedule."

Write only the closing paragraph, nothing else.`
  }

  // Retry logic for overloaded errors
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
      console.error(`Generate snippet error (attempt ${attempt}):`, error)
      
      if (error?.status === 529 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
        continue
      }
      
      if (error?.status === 529) {
        return NextResponse.json({ error: 'AI is busy — please try again in a moment' }, { status: 503 })
      }
      
      return NextResponse.json({ error: error.message || 'Failed to generate' }, { status: 500 })
    }
  }
  
  return NextResponse.json({ error: 'Failed after retries' }, { status: 500 })
}
