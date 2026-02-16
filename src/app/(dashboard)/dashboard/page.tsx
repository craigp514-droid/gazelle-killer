import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Building2, Radio, Star, ArrowRight, Flame } from 'lucide-react'
import Link from 'next/link'
import { SignalCard } from '@/components/signals/signal-card'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get user profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id)
    .single()

  // Get recent signals for cards (up to 8)
  const { data: recentSignals } = await supabase
    .from('signals')
    .select('*, companies(name, slug, website)')
    .order('signal_date', { ascending: false })
    .limit(8)

  // Get company segments for industry/segment display
  const companyIds = recentSignals?.map(s => s.company_id).filter(Boolean) || []
  const { data: companySegments } = await supabase
    .from('company_segments')
    .select('company_id, is_primary, segments(name, industries(name))')
    .in('company_id', companyIds)
    .eq('is_primary', true)

  // Build lookup for company -> industry/segment
  const companyIndustryMap: Record<string, { industry: string; segment: string }> = {}
  companySegments?.forEach((cs: any) => {
    if (cs.segments) {
      companyIndustryMap[cs.company_id] = {
        industry: cs.segments.industries?.name || '',
        segment: cs.segments.name || ''
      }
    }
  })

  // Count signals this week
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { count: signalCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .gte('signal_date', sevenDaysAgo.toISOString().split('T')[0])

  // Count site search signals
  const { count: siteSearchCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('signal_type', 'site_search')

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

  // Get user's favorites count
  const { count: favoritesCount } = await supabase
    .from('user_bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id)

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

      {/* 🔥 Recent Signals - THE DAILY RETENTION HOOK */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Signals</h2>
            {siteSearchCount && siteSearchCount > 0 && (
              <Badge className="bg-red-600 text-white text-xs">
                {siteSearchCount} Gold Lead{siteSearchCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Link 
            href="/signals" 
            className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600"
          >
            View All Signals
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {recentSignals && recentSignals.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentSignals.map((signal: any) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                industry={companyIndustryMap[signal.company_id]?.industry}
                segment={companyIndustryMap[signal.company_id]?.segment}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              No recent signals. Check back soon!
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Signals This Week
            </CardTitle>
            <Radio className="h-4 w-4 text-orange-500" />
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
            <Building2 className="h-4 w-4 text-orange-500" />
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
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topCompanies?.filter((c) => c.tier === 'A').length || 0}
            </div>
          </CardContent>
        </Card>
        <Link href="/favorites">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Favorites
              </CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{favoritesCount || 0}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

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
                    <span className="text-lg font-semibold text-orange-500">
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
  )
}
