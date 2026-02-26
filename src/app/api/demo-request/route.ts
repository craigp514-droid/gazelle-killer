import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, organization, role } = body

  if (!name || !email || !organization) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createClient()

  // Store in database
  const { error: dbError } = await supabase
    .from('demo_requests')
    .insert({
      name,
      email,
      organization,
      role,
      created_at: new Date().toISOString()
    })

  if (dbError) {
    console.error('Failed to store demo request:', dbError)
    // Continue anyway - we'll still send the email
  }

  // Send email notification using Resend
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SignalFeed <notifications@signal-feed.com>',
          to: 'craig@propel-development.com',
          subject: `🎯 New Demo Request: ${organization}`,
          html: `
            <h2>New Demo Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Organization:</strong> ${organization}</p>
            <p><strong>Role:</strong> ${role || 'Not specified'}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
            <hr>
            <p><a href="mailto:${email}">Reply to ${name}</a></p>
          `
        })
      })
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
    }
  }

  return NextResponse.json({ success: true })
}
