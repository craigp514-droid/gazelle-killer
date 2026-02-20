import { createClient } from '@/lib/supabase/server'
import { Building2, Radio, Star, TrendingUp, Search, ArrowRight } from 'lucide-react'
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

  // Get counts for the cards
  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { count: recentSignalCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString())

  const { count: totalSignalCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })

  const { count: favoritesCount } = await supabase
    .from('user_bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id)

  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="text-center pt-4">
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-slate-600 mt-2">
          What would you like to do today?
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Find Companies */}
        <Link href="/companies" className="group">
          <div className="h-full p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Search className="h-8 w-8 text-orange-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-4">Find Companies</h2>
            <p className="text-slate-600 mt-2">
              Search {companyCount?.toLocaleString() || 0} companies by industry, tier, or location
            </p>
          </div>
        </Link>

        {/* Latest Signals */}
        <Link href="/signals" className="group">
          <div className="h-full p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Radio className="h-8 w-8 text-purple-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-4">Latest Signals</h2>
            <p className="text-slate-600 mt-2">
              {recentSignalCount || 0} new signals this week • {totalSignalCount?.toLocaleString() || 0} total
            </p>
          </div>
        </Link>

        {/* My Watchlist */}
        <Link href="/favorites" className="group">
          <div className="h-full p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-4">My Watchlist</h2>
            <p className="text-slate-600 mt-2">
              {favoritesCount || 0} companies you're tracking
            </p>
          </div>
        </Link>

        {/* Project Intelligence */}
        <Link href="/projects" className="group">
          <div className="h-full p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-4">Project Intelligence</h2>
            <p className="text-slate-600 mt-2">
              {projectCount?.toLocaleString() || 0} announced facility projects
            </p>
          </div>
        </Link>
      </div>

      {/* Explore Industries */}
      <div className="text-center pt-4">
        <Link 
          href="/explore" 
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors"
        >
          <Building2 className="h-4 w-4" />
          Explore by Industry
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
