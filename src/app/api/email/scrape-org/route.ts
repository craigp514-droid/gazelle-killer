import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await request.json()
  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    // Fetch the website
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    const res = await fetch(fullUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SignalFeed/1.0)' }
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch website' }, { status: 400 })
    }

    const html = await res.text()
    
    // Extract text content (basic extraction)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000) // Limit for AI context

    // Use AI to extract key info
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ 
        name: '',
        region: '',
        valueProps: ''
      })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract the following from this organization's website content. Return JSON only, no markdown:

{
  "name": "Organization's full name",
  "region": "State, region, or area they serve",
  "valueProps": "Key benefits, incentives, or services they offer (2-3 bullet points)"
}

Website content:
${textContent}`
      }]
    })

    const content = (message.content[0] as any).text
    
    // Parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json(parsed)
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e)
    }

    return NextResponse.json({ 
      name: '',
      region: '',
      valueProps: ''
    })

  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json({ error: 'Failed to scrape' }, { status: 500 })
  }
}
