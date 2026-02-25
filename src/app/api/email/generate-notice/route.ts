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

  // Build context about the company
  const signalInfo = signals?.slice(0, 3).map((s: any) => `${s.signal_type}: ${s.title}`).join('\n') || ''
  
  const prompt = `Write a context statement for a cold email to ${company.name} that references something specific and connects it to potential growth.

Company info:
- Industry: ${company.industry || 'Unknown'}
- Location: ${company.hq_state || 'Unknown'}
${company.messaging_hook ? `- Key angle: ${company.messaging_hook}` : ''}
${signalInfo ? `\nRecent signals:\n${signalInfo}` : ''}

STRICT RULES:
1. NEVER use em-dashes (—) or double hyphens (--)
2. VARY the opener. Pick ONE randomly from: "I just came across", "I saw", "I noticed", "I read about", "I caught wind of", "Your recent", "Saw the news about", "Just read about"
3. Reference something SPECIFIC (funding round with amount, partnership, expansion news, product launch, etc.)
4. Connect it to potential GROWTH - imply you see it as a signal they might expand
5. Can be a statement OR a question (mix it up)
6. ONE or TWO sentences max, under 35 words total
7. Sound natural and human, like a real person wrote it

GOOD EXAMPLES:
- "I just came across your $100M Series C and I'd love to learn about your outlook for growth."
- "Saw the news about your partnership with [Partner]. Could that lead to expanding operations?"
- "I noticed your recent funding round. Curious if that's fueling any expansion plans?"
- "Your capacity expansion announcement caught my eye. Are you looking at new locations?"
- "Just read about your Series B. Sounds like you might be scaling up soon?"

BAD (never do this):
- "I noticed your recent Series B — exciting growth ahead." (em-dash = AI giveaway)
- Starting every message with "I noticed"
- Generic statements without specific details
- No connection to growth/expansion

Write only the statement, nothing else.`

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
        return NextResponse.json({ error: 'AI is busy — please try again in a moment' }, { status: 503 })
      }
      
      return NextResponse.json({ error: error.message || 'Failed to generate' }, { status: 500 })
    }
  }
}
