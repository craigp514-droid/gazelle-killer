import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Radio, ExternalLink, Flame } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function SignalsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('signals')
    .select('*, companies(name, slug)')
    .order('signal_date', { ascending: false })
    .limit(100)

  // Filter for site_search if requested
  if (params.filter === 'site_search') {
    query = query.eq('signal_type', 'site_search')
  }

  const { data: signals } = await query

  // Count site_search signals
  const { count: siteSearchCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('signal_type', 'site_search')

  const signalTypeColors: Record<string, string> = {
    // Tier 1 - GOLD (Site Search)
    site_search: 'bg-red-100 text-red-800 border-red-300',
    site_selection_consultant: 'bg-red-100 text-red-800 border-red-300',
    
    // Tier 2 - Expansion
    capacity_constrained: 'bg-orange-100 text-orange-800',
    evaluating_expansion: 'bg-orange-100 text-orange-800',
    
    // Tier 3 - Financial
    funding_round: 'bg-green-100 text-green-800',
    major_funding: 'bg-green-100 text-green-800',
    pe_acquisition: 'bg-green-100 text-green-800',
    chips_award: 'bg-emerald-100 text-emerald-800',
    
    // Tier 4 - Corporate
    new_ceo: 'bg-blue-100 text-blue-800',
    major_contract: 'bg-yellow-100 text-yellow-800',
    contract_award: 'bg-yellow-100 text-yellow-800',
    
    // Tier 5 - Job Postings
    job_posting_site_selection: 'bg-orange-100 text-orange-800',
    job_posting_real_estate: 'bg-amber-100 text-amber-800',
    job_posting_ops: 'bg-amber-100 text-amber-800',
    hiring_surge: 'bg-blue-100 text-blue-800',
    
    // Tier 6 - Announced/Completed
    new_facility: 'bg-purple-100 text-purple-800',
    facility_announced: 'bg-purple-100 text-purple-800',
    facility_expansion: 'bg-purple-100 text-purple-800',
    facility_opened: 'bg-slate-100 text-slate-800',
    partnership: 'bg-indigo-100 text-indigo-800',
    regulatory_approval: 'bg-teal-100 text-teal-800',
    product_launch: 'bg-pink-100 text-pink-800',
    acquisition: 'bg-orange-100 text-orange-800',
  }

  const formatSignalType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const isSiteSearch = (type: string) => {
    return type === 'site_search' || type === 'site_selection_consultant'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Signals Feed</h1>
        <p className="text-slate-600">
          All recent signals from tracked companies
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Link
          href="/signals"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !params.filter
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Signals
        </Link>
        <Link
          href="/signals?filter=site_search"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            params.filter === 'site_search'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          <Flame className="h-4 w-4" />
          Site Search ({siteSearchCount || 0})
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-600" />
            {params.filter === 'site_search' ? 'Site Search Signals (GOLD)' : 'Recent Signals'}
          </CardTitle>
          <CardDescription>
            {params.filter === 'site_search' 
              ? 'Companies actively looking for a location — highest priority leads'
              : 'Latest activity from tracked companies'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {signals && signals.length > 0 ? (
              signals.map((signal: any) => (
                <div
                  key={signal.id}
                  className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${
                    isSiteSearch(signal.signal_type) 
                      ? 'border-red-300 bg-red-50' 
                      : ''
                  }`}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isSiteSearch(signal.signal_type) && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                          <Flame className="h-3 w-3" />
                          GOLD LEAD
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={signalTypeColors[signal.signal_type] || 'bg-slate-100'}
                      >
                        {formatSignalType(signal.signal_type)}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {new Date(signal.signal_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-medium text-slate-900">{signal.title}</h3>
                    {signal.description && (
                      <p className="text-sm text-slate-600">{signal.description}</p>
                    )}
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/companies/${signal.companies?.slug}`}
                        className="text-sm text-emerald-600 hover:underline"
                      >
                        {signal.companies?.name}
                      </Link>
                      {signal.source_url && (
                        <a
                          href={signal.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                        >
                          Source
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  {signal.strength && (
                    <div className="text-right">
                      <span className="text-2xl font-bold text-emerald-600">
                        {signal.strength}
                      </span>
                      <p className="text-xs text-slate-500">Score</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                {params.filter === 'site_search'
                  ? 'No Site Search signals yet. These are the gold leads!'
                  : 'No signals recorded yet.'
                }
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
