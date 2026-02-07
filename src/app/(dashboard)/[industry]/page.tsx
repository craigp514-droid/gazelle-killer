import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { MapPin, Sparkles } from 'lucide-react'
import { FavoriteButton } from '@/components/favorites/favorite-button'

interface PageProps {
  params: Promise<{ industry: string }>
}

export default async function IndustryPage({ params }: PageProps) {
  const { industry: industrySlug } = await params
  const supabase = await createClient()

  // Get industry
  const { data: industry } = await supabase
    .from('industries')
    .select('*')
    .eq('slug', industrySlug)
    .single()

  if (!industry || industry.is_coming_soon) {
    notFound()
  }

  // Get all segments in this industry
  const { data: segments } = await supabase
    .from('segments')
    .select('*')
    .eq('industry_id', industry.id)
    .order('display_order')

  const segmentIds = segments?.map(s => s.id) || []

  // Get all companies in these segments
  const { data: companySegments } = await supabase
    .from('company_segments')
    .select('company_id, segment_id')
    .in('segment_id', segmentIds)

  const companyIds = [...new Set(companySegments?.map(cs => cs.company_id) || [])]

  // Get user's favorites
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userFavorites } = await supabase
    .from('user_bookmarks')
    .select('company_id')
    .eq('user_id', user?.id)
  
  const favoritedCompanyIds = new Set(userFavorites?.map(f => f.company_id) || [])

  // Get companies
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .in('id', companyIds)
    .order('composite_score', { ascending: false })

  // Get latest signals
  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .in('company_id', companyIds)
    .order('signal_date', { ascending: false })

  const signalsByCompany = signals?.reduce((acc: Record<string, any>, signal) => {
    if (!acc[signal.company_id]) acc[signal.company_id] = signal
    return acc
  }, {}) || {}

  // Map company to its segment
  const companyToSegment = companySegments?.reduce((acc: Record<string, string>, cs) => {
    if (!acc[cs.company_id]) acc[cs.company_id] = cs.segment_id
    return acc
  }, {}) || {}

  const segmentById = segments?.reduce((acc: Record<string, any>, s) => {
    acc[s.id] = s
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
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: industry.color ? `${industry.color}20` : '#f1f5f9' }}
        >
          <Sparkles className="h-6 w-6" style={{ color: industry.color || '#64748b' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All {industry.name}</h1>
          <p className="text-slate-600">{industry.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Badge variant="outline" className="text-sm">
          {companies?.length || 0} companies
        </Badge>
        <Badge variant="outline" className="text-sm">
          {segments?.length || 0} segments
        </Badge>
        <Badge variant="outline" className="text-sm">
          {companies?.filter(c => c.tier === 'A').length || 0} Tier A
        </Badge>
      </div>

      {/* Company Table */}
      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-slate-500">
                  <th className="pb-3 pr-2 w-10"></th>
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3 pr-4">Segment</th>
                  <th className="pb-3 pr-4">Location</th>
                  <th className="pb-3 pr-4">Tier</th>
                  <th className="pb-3 pr-4">Score</th>
                  <th className="pb-3 pr-4">Latest Signal</th>
                  <th className="pb-3">Messaging Hook</th>
                </tr>
              </thead>
              <tbody>
                {companies?.map((company) => {
                  const latestSignal = signalsByCompany[company.id]
                  const segment = segmentById[companyToSegment[company.id]]
                  return (
                    <tr key={company.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-4 pr-2">
                        <FavoriteButton 
                          companyId={company.id}
                          companyName={company.name}
                          variant="icon" 
                          initialFavorited={favoritedCompanyIds.has(company.id)}
                        />
                      </td>
                      <td className="py-4 pr-4">
                        <Link
                          href={`/companies/${company.slug}`}
                          className="font-medium text-slate-900 hover:text-emerald-600"
                        >
                          {company.name}
                        </Link>
                      </td>
                      <td className="py-4 pr-4">
                        {segment && (
                          <Link 
                            href={`/${industrySlug}/${segment.slug}`}
                            className="text-sm text-slate-600 hover:text-emerald-600"
                          >
                            {segment.name}
                          </Link>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="flex items-center gap-1 text-sm text-slate-600">
                          <MapPin className="h-3 w-3" />
                          {company.hq_city}, {company.hq_state}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant="outline" className={tierColors[company.tier as keyof typeof tierColors]}>
                          Tier {company.tier}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="font-semibold text-emerald-600">{company.composite_score}</span>
                      </td>
                      <td className="py-4 pr-4 max-w-[200px]">
                        {latestSignal && (
                          <div className="space-y-1">
                            <Badge variant="secondary" className={signalTypeColors[latestSignal.signal_type] || 'bg-slate-100'}>
                              {formatSignalType(latestSignal.signal_type)}
                            </Badge>
                            <p className="text-sm text-slate-600 line-clamp-1">{latestSignal.title}</p>
                          </div>
                        )}
                      </td>
                      <td className="py-4 max-w-[300px]">
                        <span className="text-sm text-slate-600 line-clamp-2">
                          {company.messaging_hook || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {(!companies || companies.length === 0) && (
            <p className="py-8 text-center text-sm text-slate-500">
              No companies in this industry yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
