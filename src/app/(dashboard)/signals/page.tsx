import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Flame, Radio } from 'lucide-react'
import { SignalCard } from '@/components/signals/signal-card'

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function SignalsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('signals')
    .select('*, companies(name, slug, website)')
    .order('signal_date', { ascending: false })
    .limit(100)

  // Filter for site_search if requested
  if (params.filter === 'site_search') {
    query = query.eq('signal_type', 'site_search')
  }

  const { data: signals } = await query

  // Get company segments for industry/segment display
  const companyIds = signals?.map(s => s.company_id).filter(Boolean) || []
  const { data: companySegments } = await supabase
    .from('company_segments')
    .select('company_id, is_primary, segments(name, industries(name))')
    .in('company_id', companyIds.length > 0 ? companyIds : ['00000000-0000-0000-0000-000000000000'])
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

  // Count site_search signals
  const { count: siteSearchCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('signal_type', 'site_search')

  // Total signals
  const { count: totalCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })

  const isFilteringSiteSearch = params.filter === 'site_search'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-slate-900">Signal Feed</h1>
          </div>
          <p className="text-slate-600 mt-1">
            {isFilteringSiteSearch 
              ? `${siteSearchCount || 0} gold leads — location TBD, actively searching`
              : `${totalCount || 0} signals across all tracked companies`
            }
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Link href="/signals">
          <Badge 
            variant={isFilteringSiteSearch ? "outline" : "default"}
            className={`cursor-pointer px-4 py-2 text-sm ${
              !isFilteringSiteSearch ? 'bg-orange-500 hover:bg-orange-600' : 'hover:bg-slate-100'
            }`}
          >
            All Signals ({totalCount || 0})
          </Badge>
        </Link>
        <Link href="/signals?filter=site_search">
          <Badge 
            variant={isFilteringSiteSearch ? "default" : "outline"}
            className={`cursor-pointer px-4 py-2 text-sm ${
              isFilteringSiteSearch 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'border-red-300 text-red-700 hover:bg-red-50'
            }`}
          >
            <Flame className="w-3 h-3 mr-1" />
            Gold Leads ({siteSearchCount || 0})
          </Badge>
        </Link>
      </div>

      {/* Signal Cards Grid */}
      {signals && signals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {signals.map((signal: any) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              industry={companyIndustryMap[signal.company_id]?.industry}
              segment={companyIndustryMap[signal.company_id]?.segment}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          {isFilteringSiteSearch 
            ? 'No gold leads yet. Check back when Todd finds site searches!'
            : 'No signals yet. The feed will populate as companies are tracked.'
          }
        </div>
      )}
    </div>
  )
}
