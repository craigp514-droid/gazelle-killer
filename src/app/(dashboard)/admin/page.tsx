import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Building2, 
  Radio, 
  TrendingUp,
  Calendar,
  Clock,
  Star,
  Shield
} from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('platform_admin')
    .eq('id', user?.id)
    .single()

  if (!profile?.platform_admin) {
    redirect('/dashboard')
  }

  // Get all users with their stats
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, platform_admin, role, created_at, last_login_at')
    .order('created_at', { ascending: false })

  // Get favorites count per user
  const { data: bookmarks } = await supabase
    .from('user_bookmarks')
    .select('user_id')

  const favoritesPerUser: Record<string, number> = {}
  bookmarks?.forEach(b => {
    favoritesPerUser[b.user_id] = (favoritesPerUser[b.user_id] || 0) + 1
  })

  // Get platform stats
  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  const { count: signalCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })

  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  // Get signups this week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  
  const { count: newUsersThisWeek } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneWeekAgo.toISOString())

  // Get active users (logged in within last 7 days)
  const { count: activeUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('last_login_at', oneWeekAgo.toISOString())

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
          <Shield className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600">Platform management and user analytics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-slate-500">
              {newUsersThisWeek} new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers || 0}</div>
            <p className="text-xs text-slate-500">Logged in last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Signals / Projects</CardTitle>
            <Radio className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signalCount || 0} / {projectCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            {users?.length} registered users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-slate-600">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Signed Up</th>
                  <th className="pb-3 font-medium">Last Active</th>
                  <th className="pb-3 font-medium text-right">Favorites</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.map((user) => (
                  <tr key={user.id} className="text-sm">
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name || '(No name)'}</p>
                        <p className="text-slate-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {user.platform_admin && (
                          <Badge className="bg-orange-100 text-orange-800">Admin</Badge>
                        )}
                        <Badge variant="outline">{user.role || 'user'}</Badge>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-3 text-slate-600">
                      {formatTime(user.last_login_at)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span>{favoritesPerUser[user.id] || 0}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
