import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Building2, Radio, Star } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get user profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id)
    .single()

  // Get recent signals (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { data: recentSignals, count: signalCount } = await supabase
    .from('signals')
    .select('*, companies(name, slug)', { count: 'exact' })
    .gte('signal_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('signal_date', { ascending: false })
    .limit(10)

  // Get top companies by score
  const { data: topCompanies } = await supabase
    .from('companies')
    .select('*')
    .order('composite_score', { ascending: false })
    .limit(5)

  // Get total company count
  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  const signalTypeColors: Record<string, string> = {
    funding_round: 'bg-green-100 text-green-800',
    hiring_surge: 'bg-blue-100 text-blue-800',
    new_facility: 'bg-purple-100 text-purple-800',
    contract_award: 'bg-yellow-100 text-yellow-800',
    partnership: 'bg-indigo-100 text-indigo-800',
    regulatory_approval: 'bg-teal-100 text-teal-800',
    product_launch: 'bg-pink-100 text-pink-800',
    acquisition: 'bg-orange-100 text-orange-800',
    layoff: 'bg-red-100 text-red-800',
    facility_closure: 'bg-red-100 text-red-800',
  }

  const formatSignalType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {profile?.full_name || 'there'}
        </h1>
        <p className="text-slate-600">
          Here&apos;s what&apos;s happening with your target companies.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Signals This Week
            </CardTitle>
            <Radio className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signalCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Companies
            </CardTitle>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Tier A Companies
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topCompanies?.filter((c) => c.tier === 'A').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Favorites
            </CardTitle>
            <Star className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Signals */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Signals</CardTitle>
            <CardDescription>Recent activity from tracked companies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSignals && recentSignals.length > 0 ? (
                recentSignals.map((signal: any) => (
                  <div
                    key={signal.id}
                    className="flex items-start justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <Link
                        href={`/companies/${signal.companies?.slug}`}
                        className="font-medium text-slate-900 hover:text-emerald-600"
                      >
                        {signal.companies?.name}
                      </Link>
                      <p className="text-sm text-slate-600">{signal.title}</p>
                      <Badge
                        variant="secondary"
                        className={signalTypeColors[signal.signal_type] || 'bg-slate-100'}
                      >
                        {formatSignalType(signal.signal_type)}
                      </Badge>
                    </div>
                    <span className="text-sm text-slate-500">
                      {new Date(signal.signal_date).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No recent signals</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card>
          <CardHeader>
            <CardTitle>Top Companies</CardTitle>
            <CardDescription>Highest scoring targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCompanies && topCompanies.length > 0 ? (
                topCompanies.map((company: any) => (
                  <Link
                    key={company.id}
                    href={`/companies/${company.slug}`}
                    className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{company.name}</p>
                      <p className="text-sm text-slate-600">
                        {company.hq_city}, {company.hq_state}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={
                          company.tier === 'A'
                            ? 'bg-green-100 text-green-800'
                            : company.tier === 'B'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-slate-100 text-slate-800'
                        }
                      >
                        Tier {company.tier}
                      </Badge>
                      <span className="text-lg font-semibold text-emerald-600">
                        {company.composite_score}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500">No companies yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
