import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, TrendingUp, Radio } from 'lucide-react'
import Link from 'next/link'
import { FavoriteButton } from '@/components/favorites/favorite-button'
import { ExportFavoritesButton } from '@/components/favorites/export-favorites-button'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's bookmarks with company info
  const { data: bookmarks } = await supabase
    .from('user_bookmarks')
    .select('*, notes, companies(*)')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  // Prepare data for export
  const exportData = bookmarks?.map((b: any) => ({
    company: b.companies,
    notes: b.notes,
    created_at: b.created_at
  })) || []

  // Get company IDs to fetch their latest signals
  const companyIds = bookmarks?.map((b: any) => b.company_id) || []
  
  // Get latest signals for favorited companies
  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .in('company_id', companyIds)
    .order('created_at', { ascending: false })

  // Map latest signal to each company
  const signalsByCompany = signals?.reduce((acc: Record<string, any>, signal) => {
    if (!acc[signal.company_id]) {
      acc[signal.company_id] = signal
    }
    return acc
  }, {}) || {}

  const tierColors = {
    A: 'bg-green-100 text-green-800 border-green-200',
    B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    C: 'bg-slate-100 text-slate-800 border-slate-200',
  }

  const signalTypeColors: Record<string, string> = {
    funding_round: 'bg-green-100 text-green-800',
    hiring_surge: 'bg-blue-100 text-blue-800',
    new_facility: 'bg-purple-100 text-purple-800',
    contract_award: 'bg-yellow-100 text-yellow-800',
    partnership: 'bg-indigo-100 text-indigo-800',
    regulatory_approval: 'bg-teal-100 text-teal-800',
  }

  const formatSignalType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
          <p className="text-slate-600">
            Companies you&apos;re tracking
          </p>
        </div>
        <ExportFavoritesButton favorites={exportData} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Favorites
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookmarks?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Tier A Companies
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookmarks?.filter((b: any) => b.companies?.tier === 'A').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Recent Signals
            </CardTitle>
            <Radio className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {signals?.filter((s: any) => {
                const signalDate = new Date(s.signal_date)
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return signalDate > weekAgo
              }).length || 0}
            </div>
            <p className="text-xs text-slate-500">in the last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Favorites List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Your Watchlist
          </CardTitle>
          <CardDescription>{bookmarks?.length || 0} companies</CardDescription>
        </CardHeader>
        <CardContent>
          {bookmarks && bookmarks.length > 0 ? (
            <div className="space-y-4">
              {bookmarks.map((bookmark: any) => {
                const company = bookmark.companies
                const latestSignal = signalsByCompany[company?.id]
                
                return (
                  <div
                    key={bookmark.id}
                    className="flex items-start justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/companies/${company?.slug}`}
                          className="font-medium text-slate-900 hover:text-orange-500"
                        >
                          {company?.name}
                        </Link>
                        <Badge
                          variant="outline"
                          className={tierColors[company?.tier as keyof typeof tierColors]}
                        >
                          Tier {company?.tier}
                        </Badge>
                        <span className="font-semibold text-orange-500">
                          {company?.composite_score}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {company?.hq_city}, {company?.hq_state}
                        </span>
                        <span>
                          Added {new Date(bookmark.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {latestSignal && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={signalTypeColors[latestSignal.signal_type] || 'bg-slate-100'}
                          >
                            {formatSignalType(latestSignal.signal_type)}
                          </Badge>
                          <span className="text-sm text-slate-600">
                            {latestSignal.title}
                          </span>
                          <span className="text-sm text-slate-400">
                            ({new Date(latestSignal.signal_date).toLocaleDateString()})
                          </span>
                        </div>
                      )}

                      {company?.messaging_hook && (
                        <p className="text-sm text-slate-600 line-clamp-1">
                          💡 {company.messaging_hook}
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      <FavoriteButton 
                        companyId={company?.id} 
                        initialFavorited={true}
                        variant="icon"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Star className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-medium text-slate-900">No favorites yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Star companies from the segment pages or company details to add them to your watchlist.
              </p>
              <Link
                href="/segments"
                className="mt-4 inline-block text-sm font-medium text-orange-500 hover:underline"
              >
                Browse segments →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
