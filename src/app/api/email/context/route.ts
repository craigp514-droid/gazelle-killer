import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_type, org_website, org_name, org_region, org_value_props')
    .eq('id', user.id)
    .single()

  return NextResponse.json(profile || {})
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { org_type, org_website, org_name, org_region, org_value_props } = body

  const { error } = await supabase
    .from('profiles')
    .update({
      org_type,
      org_website,
      org_name,
      org_region,
      org_value_props,
      email_onboarding_complete: true, // Mark as complete when they save context
    })
    .eq('id', user.id)

  if (error) {
    console.error('Failed to save context:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
