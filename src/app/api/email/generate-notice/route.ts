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

  // Get user's org context for relevance
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_type, org_name, org_region, org_value_props')
    .eq('id', user.id)
    .single()

  const orgContext = profile?.org_type === 'edo'
    ? `an Economic Development Organization in ${profile?.org_region || 'their region'}`
    : 'a site selection consultant'
  const orgValueProps = profile?.org_value_props || ''
  const orgRegion = profile?.org_region || ''

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // Determine what context we have
  const signalInfo = signals?.slice(0, 3).map((s: any) => `${s.signal_type}: ${s.title}`).join('\n') || ''
  const hasSignals = signals && signals.length > 0
  const hasMessagingHook = !!company.messaging_hook
  const hasLinkedIn = !!company.linkedin_description
  
  let prompt = ''
  
  if (hasSignals) {
    // BEST CASE: We have signals - reference them specifically
    prompt = `Write a context statement for a cold email to ${company.name} that references a specific signal and connects it to potential growth.

Company info:
- Industry: ${company.industry || 'Unknown'}
- Location: ${company.hq_state || 'Unknown'}
${company.messaging_hook ? `- Key angle: ${company.messaging_hook}` : ''}

Recent signals:
${signalInfo}

STRICT RULES:
1. NEVER use em-dashes (—) or double hyphens (--)
2. VARY the opener. Pick ONE randomly from: "I just came across", "I saw", "I noticed", "I read about", "I caught wind of", "Your recent", "Saw the news about", "Just read about"
3. Reference something SPECIFIC from the signals (funding round with amount, partnership, expansion news, etc.)
4. Connect it to potential GROWTH - imply you see it as a signal they might expand
5. Can be a statement OR a question (mix it up)
6. ONE or TWO sentences max, under 35 words total
7. Sound natural and human

GOOD EXAMPLES:
- "I just came across your $100M Series C and I'd love to learn about your outlook for growth."
- "Saw the news about your partnership with [Partner]. Could that lead to expanding operations?"
- "Your capacity expansion announcement caught my eye. Are you looking at new locations?"

Write only the statement, nothing else.`

  } else if (hasMessagingHook || hasLinkedIn) {
    // FALLBACK: No signals but we have company context - connect to org
    prompt = `Write a context statement for a cold email to ${company.name} from ${orgContext}.

We don't have specific news about them, but we know what they do. Reference their business and connect it to why our region/services might be relevant.

Company info:
- Industry: ${company.industry || 'Unknown'}
- Location: ${company.hq_state || 'Unknown'}
${company.messaging_hook ? `- What makes them interesting: ${company.messaging_hook}` : ''}
${company.linkedin_description ? `- What they do: ${company.linkedin_description.slice(0, 300)}` : ''}

Our org context:
- We are: ${orgContext}
${orgRegion ? `- Our region: ${orgRegion}` : ''}
${orgValueProps ? `- Our strengths: ${orgValueProps}` : ''}

STRICT RULES:
1. NEVER use em-dashes (—) or double hyphens (--)
2. Reference what THEY do specifically (their product, technology, market)
3. Connect it to why OUR region or services might be relevant to them
4. Imply potential for growth/expansion
5. Can be a statement OR a question
6. ONE or TWO sentences max, under 35 words
7. Sound natural and human

GOOD EXAMPLES:
- "Your work in autonomous robotics caught my eye. Our region has a growing manufacturing cluster that might be relevant if you're scaling."
- "I came across your semiconductor platform. We've been working with similar companies on expansion projects in ${orgRegion || 'our region'}."
- "Your approach to [specific thing] stands out. Curious if you're exploring new locations? We work with companies in your space."

Write only the statement, nothing else.`

  } else {
    // LAST RESORT: Only have industry - connect industry to org relevance
    prompt = `Write a context statement for a cold email to ${company.name} from ${orgContext}.

We don't have specific news or details about them, just their industry. Reference industry activity and connect it to why our region/services might be relevant.

Company info:
- Company: ${company.name}
- Industry: ${company.industry || 'Technology'}
- Location: ${company.hq_state || 'Unknown'}

Our org context:
- We are: ${orgContext}
${orgRegion ? `- Our region: ${orgRegion}` : ''}
${orgValueProps ? `- Our strengths: ${orgValueProps}` : ''}

STRICT RULES:
1. NEVER use em-dashes (—) or double hyphens (--)
2. Reference the industry and general growth trends
3. Connect it to why OUR region or services might be relevant
4. Ask about their growth/expansion plans
5. ONE or TWO sentences max, under 35 words
6. Sound natural and human

GOOD EXAMPLES:
- "I've been tracking the ${company.industry || 'tech'} space and there's been a lot of expansion activity. Our region has been a destination for similar companies."
- "With the momentum in ${company.industry || 'your industry'}, I wanted to reach out. We work with companies exploring new locations."
- "The ${company.industry || 'sector'} has been growing fast. Curious if expansion is on your radar? Our region might be a fit."

Write only the statement, nothing else.`
  }

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
      console.error(`Generate notice error (attempt ${attempt}):`, error)
      
      if (error?.status === 529 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
        continue
      }
      
      if (error?.status === 529) {
        return NextResponse.json({ error: 'AI is busy, please try again in a moment' }, { status: 503 })
      }
      
      return NextResponse.json({ error: error.message || 'Failed to generate' }, { status: 500 })
    }
  }
  
  return NextResponse.json({ error: 'Failed after retries' }, { status: 500 })
}
