import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, User, Building2 } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile with organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user?.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-600" />
              Profile
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-500">Name</label>
              <p className="text-slate-900">{profile?.full_name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Email</label>
              <p className="text-slate-900">{profile?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Role</label>
              <p className="text-slate-900 capitalize">{profile?.role || 'Viewer'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Last Login</label>
              <p className="text-slate-900">
                {profile?.last_login_at
                  ? new Date(profile.last_login_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600" />
              Organization
            </CardTitle>
            <CardDescription>Your team&apos;s workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.organizations ? (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-500">Name</label>
                  <p className="text-slate-900">{profile.organizations.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Plan</label>
                  <Badge variant="secondary" className="ml-2 capitalize">
                    {profile.organizations.subscription_tier}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Max Users</label>
                  <p className="text-slate-900">{profile.organizations.max_users}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                You&apos;re not part of an organization yet. Contact support to get set up.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
