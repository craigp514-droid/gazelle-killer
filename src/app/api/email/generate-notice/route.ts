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
  
  const prompt = `Write a single "I noticed..." statement for a cold email to ${company.name}.

Company info:
- Industry: ${company.industry || 'Unknown'}
- Location: ${company.hq_state || 'Unknown'}
${company.messaging_hook ? `- Key angle: ${company.messaging_hook}` : ''}
${signalInfo ? `\nRecent signals:\n${signalInfo}` : ''}

Requirements:
- Start with "I noticed..." or "I came across..." or "I saw that..."
- Reference something SPECIFIC (a signal, funding round, expansion news, industry trend, etc.)
- ONE sentence only, under 25 words
- Sound natural and human
- Do NOT pitch anything — just show you did your homework

Examples of good statements:
- "I noticed your recent Series B and the expansion plans mentioned in the announcement."
- "I came across the news about your new manufacturing partnership with [Partner]."
- "I saw that you're scaling up production capacity — exciting growth."

Write only the statement, nothing else.`

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
    console.error('Generate notice error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
