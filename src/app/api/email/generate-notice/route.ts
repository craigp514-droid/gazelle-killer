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
    // FALLBACK: No signals but we have company context
    prompt = `Write a context statement for a cold email to ${company.name}. We don't have specific news, but reference what makes them interesting and connect it to potential growth.

Company info:
- Industry: ${company.industry || 'Unknown'}
- Location: ${company.hq_state || 'Unknown'}
${company.messaging_hook ? `- What makes them interesting: ${company.messaging_hook}` : ''}
${company.linkedin_description ? `- About them: ${company.linkedin_description.slice(0, 300)}` : ''}

STRICT RULES:
1. NEVER use em-dashes (—) or double hyphens (--)
2. Reference their business, technology, or market position
3. Connect it to potential GROWTH or expansion
4. Can be a statement OR a question
5. ONE or TWO sentences max, under 35 words
6. Sound natural and human, not generic

GOOD EXAMPLES:
- "I've been following the [industry] space and your approach to [specific thing] stands out. Curious if growth is on the horizon?"
- "Your work in [specific area] caught my attention. Are you exploring new markets or locations?"
- "I came across your platform and the [specific capability] seems like it could scale. Any expansion plans brewing?"

BAD (never do this):
- Generic "I noticed your company" without specifics
- Em-dashes
- Overly formal or salesy language

Write only the statement, nothing else.`

  } else {
    // LAST RESORT: Only have industry - use industry trends
    prompt = `Write a context statement for a cold email to ${company.name}. We don't have specific news about them, so reference industry trends and connect it to their potential growth.

Company info:
- Company: ${company.name}
- Industry: ${company.industry || 'Technology'}
- Location: ${company.hq_state || 'Unknown'}

STRICT RULES:
1. NEVER use em-dashes (—) or double hyphens (--)
2. Reference industry momentum or trends, not the specific company
3. Connect it to THEIR potential growth or expansion
4. Can be a statement OR a question
5. ONE or TWO sentences max, under 35 words
6. Sound natural and human

GOOD EXAMPLES:
- "I've been tracking the ${company.industry || 'tech'} space and there's a lot of expansion activity. Is growth on your radar too?"
- "The ${company.industry || 'industry'} sector has been heating up lately. Curious if you're planning any expansion?"
- "With all the momentum in ${company.industry || 'your space'}, I'm reaching out to companies that might be scaling. Are you exploring new locations?"

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
