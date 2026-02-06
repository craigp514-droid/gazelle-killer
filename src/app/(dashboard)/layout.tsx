import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Segment, Profile } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get segments (will be filtered by RLS based on user's org)
  const { data: segments } = await supabase
    .from('segments')
    .select('*')
    .order('display_order')

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar segments={(segments as Segment[]) || []} />
      <div className="pl-64">
        <Header user={profile as Profile | null} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
