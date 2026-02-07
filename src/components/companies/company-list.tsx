'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { FavoriteButton } from '@/components/favorites/favorite-button'

interface Industry {
  id: string
  name: string
  slug: string
  color: string | null
}

interface Segment {
  id: string
  name: string
  slug: string
  industry_id: string | null
}

interface Company {
  id: string
  name: string
  slug: string
  hq_city: string | null
  hq_state: string | null
  tier: string
  composite_score: number
  messaging_hook: string | null
  sub_segment: string | null
}

interface Signal {
  id: string
  signal_type: string
  title: string
  signal_date: string
}

interface CompanyListProps {
  companies: Company[]
  industries: Industry[]
  segments: Segment[]
  selectedIndustry?: string
  selectedSegment?: string
  currentPage: number
  totalPages: number
  totalCount: number
  view: string
  signalsByCompany: Record<string, Signal>
  favoritedCompanyIds: Set<string>
  companyPrimarySegment: Record<string, { segment: Segment; industry: Industry | null }>
}

export function CompanyList({
  companies,
  industries,
  segments,
  selectedIndustry,
  selectedSegment,
  currentPage,
  totalPages,
  totalCount,
  view,
  signalsByCompany,
  favoritedCompanyIds,
  companyPrimarySegment,
}: CompanyListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    
    // Reset to page 1 when filters change (unless changing page)
    if (!('page' in updates)) {
      params.delete('page')
    }
    
    router.push(`/companies?${params.toString()}`)
  }

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

  const isCompact = view === 'compact'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Companies</h1>
          <p className="text-slate-600 mt-1">
            {totalCount} companies across all tracked industries
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white border rounded-lg">
        {/* Industry Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Industry:</label>
          <select
            value={selectedIndustry || ''}
            onChange={(e) => updateFilters({ 
              industry: e.target.value || null,
              segment: null // Reset segment when industry changes
            })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Industries</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.slug}>
                {industry.name}
              </option>
            ))}
          </select>
        </div>

        {/* Segment Filter (only show when industry selected) */}
        {selectedIndustry && segments.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Segment:</label>
            <select
              value={selectedSegment || ''}
              onChange={(e) => updateFilters({ segment: e.target.value || null })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Segments</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.slug}>
                  {segment.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => updateFilters({ view: 'detailed' })}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !isCompact 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Detailed
          </button>
          <button
            onClick={() => updateFilters({ view: 'compact' })}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isCompact 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="h-4 w-4" />
            Compact
          </button>
        </div>
      </div>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Showing {companies.length} of {totalCount} companies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-slate-500">
                  <th className="pb-3 pr-2 w-10"></th>
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3 pr-4">Industry</th>
                  <th className="pb-3 pr-4">Segment</th>
                  <th className="pb-3 pr-4">Location</th>
                  <th className="pb-3 pr-4">Tier</th>
                  <th className="pb-3 pr-4">Score</th>
                  {!isCompact && (
                    <>
                      <th className="pb-3 pr-4">Latest Signal</th>
                      <th className="pb-3">Messaging Hook</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const latestSignal = signalsByCompany[company.id]
                  const segmentInfo = companyPrimarySegment[company.id]
                  
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
                        {segmentInfo?.industry && (
                          <span 
                            className="text-sm px-2 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: `${segmentInfo.industry.color}15`,
                              color: segmentInfo.industry.color || '#64748b'
                            }}
                          >
                            {segmentInfo.industry.name}
                          </span>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="text-sm text-slate-600">
                          {segmentInfo?.segment?.name || '—'}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="flex items-center gap-1 text-sm text-slate-600">
                          <MapPin className="h-3 w-3" />
                          {company.hq_city && company.hq_state 
                            ? `${company.hq_city}, ${company.hq_state}`
                            : '—'}
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
                      {!isCompact && (
                        <>
                          <td className="py-4 pr-4 max-w-[200px]">
                            {latestSignal ? (
                              <div className="space-y-1">
                                <Badge variant="secondary" className={signalTypeColors[latestSignal.signal_type] || 'bg-slate-100'}>
                                  {formatSignalType(latestSignal.signal_type)}
                                </Badge>
                                <p className="text-sm text-slate-600 line-clamp-1">{latestSignal.title}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-4 max-w-[300px]">
                            <span className="text-sm text-slate-600 line-clamp-2">
                              {company.messaging_hook || '—'}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {companies.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No companies found with the selected filters.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateFilters({ page: String(currentPage - 1) })}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => updateFilters({ page: String(currentPage + 1) })}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
