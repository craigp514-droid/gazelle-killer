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

  const { company, signals, type } = await request.json()

  // Get user's org context
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_type, org_name, org_region, org_value_props')
    .eq('id', user.id)
    .single()

  const orgType = profile?.org_type || 'edo'
  const orgName = profile?.org_name || 'our organization'
  const orgRegion = profile?.org_region || 'our region'

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // Build context
  const signalInfo = signals?.slice(0, 2).map((s: any) => `${s.signal_type}: ${s.title}`).join('; ') || ''
  const hasSignals = signals && signals.length > 0

  let prompt = ''

  if (type === 'connection') {
    // Connection Request - 300 char limit, very punchy
    prompt = `Write a LinkedIn connection request message (MUST be under 280 characters) to someone at ${company.name}.

Sender context:
- I work at: ${orgName}
- We are: ${orgType === 'edo' ? `an Economic Development Organization in ${orgRegion}` : 'site selection consultants'}

Company context:
- Company: ${company.name}
- Industry: ${company.industry || 'Technology'}
${hasSignals ? `- Recent activity: ${signalInfo}` : ''}
${company.messaging_hook ? `- Angle: ${company.messaging_hook}` : ''}

STRICT RULES:
1. MUST be under 280 characters (hard LinkedIn limit is 300, leave buffer)
2. NEVER use em-dashes (—) or double hyphens (--)
3. Start with "Hi" or their name placeholder [Name]
4. Mention ONE specific thing (signal, their work, industry)
5. Connect it to potential growth/expansion
6. End with simple ask to connect
7. Casual, human tone. Not formal.
8. NO sales pitch. Just foot in the door.

GOOD EXAMPLES (note the length):
- "Hi [Name], saw the news about your Series B. Always interested in connecting with growing companies in the robotics space. Would love to connect!"
- "Hi! Your work in semiconductor manufacturing caught my eye. We work with companies exploring expansion. Would be great to connect."
- "[Name], noticed your expansion announcement. I work in economic development and would love to learn more about your growth plans. Let's connect!"

Write ONLY the message, nothing else. Count your characters!`

  } else {
    // InMail - longer, more room but still concise
    prompt = `Write a LinkedIn InMail message to someone at ${company.name}.

Sender context:
- I work at: ${orgName}
- We are: ${orgType === 'edo' ? `an Economic Development Organization in ${orgRegion}` : 'site selection consultants'}
${profile?.org_value_props ? `- Our strengths: ${profile.org_value_props}` : ''}

Company context:
- Company: ${company.name}
- Industry: ${company.industry || 'Technology'}
- Location: ${company.hq_state || 'Unknown'}
${hasSignals ? `- Recent signals: ${signalInfo}` : ''}
${company.messaging_hook ? `- Angle: ${company.messaging_hook}` : ''}
${company.linkedin_description ? `- About them: ${company.linkedin_description.slice(0, 200)}` : ''}

STRICT RULES:
1. Keep under 500 characters (even though limit is higher, shorter wins)
2. NEVER use em-dashes (—) or double hyphens (--)
3. Lead with relevance, not a generic intro
4. Mention something SPECIFIC about them or their company
5. Connect it to growth/expansion potential
6. End with ONE clear, low-pressure ask
7. Casual but professional tone
8. No formal sign-off needed

GOOD STRUCTURE:
- Hook: "I saw [specific thing]..."
- Relevance: "...and it caught my attention because [why]"
- Bridge: Brief mention of how you might help
- Ask: "Worth a quick chat?" or "Open to connecting?"

GOOD EXAMPLE:
"Hi [Name],

I saw your recent funding announcement and the expansion plans mentioned. Congrats on the momentum!

I work with ${orgType === 'edo' ? `companies exploring locations in ${orgRegion}` : 'companies navigating site selection'} and your growth trajectory caught my eye.

Would love to learn more about your plans. Worth a quick chat?"

Write ONLY the message, nothing else.`
  }

  // Retry logic
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: type === 'connection' ? 150 : 300,
        messages: [{ role: 'user', content: prompt }]
      })

      let content = (message.content[0] as any).text.trim()
      
      // For connection requests, enforce the limit
      if (type === 'connection' && content.length > 300) {
        // Try to truncate gracefully at a sentence or phrase boundary
        content = content.slice(0, 297) + '...'
      }

      return NextResponse.json({ content })
    } catch (error: any) {
      console.error(`Generate LinkedIn error (attempt ${attempt}):`, error)
      
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
