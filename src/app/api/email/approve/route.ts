import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { companyId, fullEmail, intro, context, close } = body

  if (!fullEmail) {
    return NextResponse.json({ error: 'Missing email content' }, { status: 400 })
  }

  // Check how many drafts user has
  const { count } = await supabase
    .from('email_approved_drafts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // If user has 5+ drafts, delete the oldest one
  if (count && count >= 5) {
    const { data: oldest } = await supabase
      .from('email_approved_drafts')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (oldest) {
      await supabase
        .from('email_approved_drafts')
        .delete()
        .eq('id', oldest.id)
    }
  }

  // Insert new approved draft
  const { error } = await supabase
    .from('email_approved_drafts')
    .insert({
      user_id: user.id,
      company_id: companyId || null,
      full_email: fullEmail,
      intro_paragraph: intro || null,
      context_paragraph: context || null,
      close_paragraph: close || null,
    })

  if (error) {
    console.error('Failed to save approved draft:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
