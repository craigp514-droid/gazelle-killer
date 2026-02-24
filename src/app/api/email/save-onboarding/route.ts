import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await request.json()
  const { 
    orgType, 
    orgWebsite, 
    orgName, 
    orgRegion, 
    orgValueProps,
    defaultIntro,
    defaultClose 
  } = data

  try {
    // Update profile with org info
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        org_type: orgType,
        org_website: orgWebsite,
        org_name: orgName,
        org_region: orgRegion,
        org_value_props: orgValueProps,
        email_onboarding_complete: true,
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    // Save default intro snippet
    if (defaultIntro) {
      // First, unset any existing default intro
      await supabase
        .from('email_snippets')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('snippet_type', 'intro')

      // Create new default intro
      const { error: introError } = await supabase
        .from('email_snippets')
        .insert({
          user_id: user.id,
          snippet_type: 'intro',
          name: 'Default Intro',
          content: defaultIntro,
          is_default: true,
        })

      if (introError) {
        console.error('Intro save error:', introError)
      }
    }

    // Save default close snippet
    if (defaultClose) {
      // First, unset any existing default close
      await supabase
        .from('email_snippets')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('snippet_type', 'close')

      // Create new default close
      const { error: closeError } = await supabase
        .from('email_snippets')
        .insert({
          user_id: user.id,
          snippet_type: 'close',
          name: 'Default Close',
          content: defaultClose,
          is_default: true,
        })

      if (closeError) {
        console.error('Close save error:', closeError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save onboarding error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
