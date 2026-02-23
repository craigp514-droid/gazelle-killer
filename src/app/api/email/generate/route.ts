import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { section, company, signals, existingIntro, existingContext } = body

  // Get user profile for personalization (gracefully handle missing columns)
  let profile: any = null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    if (!error) profile = data
  } catch (e) {
    console.log('Profile fetch skipped:', e)
  }

  // Get recent approved drafts for style learning (gracefully handle if table doesn't exist)
  let styleExamples: string[] = []
  try {
    const { data: approvedDrafts, error } = await supabase
      .from('email_approved_drafts')
      .select('full_email')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    if (!error && approvedDrafts) {
      styleExamples = approvedDrafts.map(d => d.full_email).filter(Boolean)
    }
  } catch (e) {
    console.log('Approved drafts fetch skipped:', e)
  }

  // Build context for AI
  const companyContext = `
Company: ${company.name}
Industry: ${company.industry || 'Unknown'}
Location: ${company.hq_state || 'Unknown'}
Website: ${company.website || 'N/A'}
${company.linkedin_description ? `About: ${company.linkedin_description.slice(0, 500)}` : ''}
${company.messaging_hook ? `Messaging Hook: ${company.messaging_hook}` : ''}

Recent Signals:
${signals?.slice(0, 3).map((s: any) => `- ${s.signal_type}: ${s.title}`).join('\n') || 'No recent signals'}
`.trim()

  const userContext = `
User's Organization: Economic Development Organization
User's State/Region: Your Region
User's Role: Economic Development Professional
`.trim()

  const styleContext = styleExamples.length > 0 ? `
Here are examples of emails this user has approved (match this style):
${styleExamples.slice(0, 3).map((e, i) => `Example ${i + 1}:\n${e}`).join('\n\n')}
` : ''

  let systemPrompt = `You are an expert cold email writer for economic development professionals. 
Your emails help them reach out to companies about locating facilities in their region.

Guidelines:
- Keep it SHORT (under 120 words total for full email)
- Write at a 6th-8th grade reading level
- Be direct, no fluff
- Sound human, not like AI
- Use contractions (I'm, we're, don't)
- Never use phrases like "I hope this email finds you", "I wanted to reach out", "Please don't hesitate"
- Reference specific company signals or news when available
- Focus on genuine value, not just asking for time

${styleContext}

${userContext}

Company context:
${companyContext}
`

  try {
    if (section === 'all') {
      // Generate complete email
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Write a complete cold email with 3 short paragraphs:

1. INTRO (2-3 sentences): Hook them with something specific about their company - a recent signal, news, or trend. Show you've done your homework.

2. CONTEXT/VALUE (2-3 sentences): Briefly mention what your region offers that's relevant to them. Be specific, not generic.

3. CLOSE (1-2 sentences): Simple, low-pressure ask. "Worth a 15-min call?" or similar.

Return in this exact format:
---INTRO---
[intro paragraph]
---CONTEXT---
[context paragraph]
---CLOSE---
[close paragraph]`
        }]
      })

      const content = (message.content[0] as any).text
      
      // Parse the sections
      const introMatch = content.match(/---INTRO---\s*([\s\S]*?)(?=---CONTEXT---|$)/i)
      const contextMatch = content.match(/---CONTEXT---\s*([\s\S]*?)(?=---CLOSE---|$)/i)
      const closeMatch = content.match(/---CLOSE---\s*([\s\S]*?)$/i)

      return NextResponse.json({
        intro: introMatch?.[1]?.trim() || '',
        context: contextMatch?.[1]?.trim() || '',
        close: closeMatch?.[1]?.trim() || '',
      })
    } else {
      // Generate single section
      let prompt = ''
      
      if (section === 'intro') {
        prompt = `Write ONLY an intro paragraph (2-3 sentences) that hooks the reader with something specific about their company. Reference a recent signal, news, or industry trend. Show you've done your homework. Keep it under 40 words.`
      } else if (section === 'context') {
        prompt = `${existingIntro ? `The intro paragraph is:\n"${existingIntro}"\n\n` : ''}Write ONLY a context/value paragraph (2-3 sentences) that briefly mentions what the user's region offers that's relevant to this company. Be specific, not generic. Keep it under 40 words.`
      } else if (section === 'close') {
        prompt = `${existingIntro ? `The intro is:\n"${existingIntro}"\n\n` : ''}${existingContext ? `The context is:\n"${existingContext}"\n\n` : ''}Write ONLY a closing paragraph (1-2 sentences) with a simple, low-pressure ask. Something like "Worth a 15-min call?" Keep it under 25 words. Don't be pushy.`
      }

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })

      return NextResponse.json({
        content: (message.content[0] as any).text.trim()
      })
    }
  } catch (error: any) {
    console.error('AI generation error:', error)
    const message = error?.message || error?.toString() || 'Unknown error'
    return NextResponse.json({ error: `AI Error: ${message}` }, { status: 500 })
  }
}
