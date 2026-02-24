import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: snippets, error } = await supabase
    .from('email_snippets')
    .select('id, name, content, snippet_type, is_default')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load snippets:', error)
    return NextResponse.json({ snippets: [] })
  }

  return NextResponse.json({ snippets })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { snippet_type, name, content, is_default } = await request.json()

  if (!snippet_type || !name || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // If setting as default, unset other defaults of same type
  if (is_default) {
    await supabase
      .from('email_snippets')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('snippet_type', snippet_type)
  }

  const { data, error } = await supabase
    .from('email_snippets')
    .insert({
      user_id: user.id,
      snippet_type,
      name,
      content,
      is_default: is_default || false,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to save snippet:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ snippet: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing snippet id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('email_snippets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete snippet:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
