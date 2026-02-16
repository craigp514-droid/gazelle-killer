'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CompanyLogo } from '@/components/ui/company-logo'
import { Flame } from 'lucide-react'

interface SignalCardProps {
  signal: {
    id: string
    signal_type: string
    title: string
    signal_date: string
    companies: {
      name: string
      slug: string
      website: string | null
    } | null
  }
  industry?: string
  segment?: string
}

const highLevelTags: Record<string, { label: string; color: string }> = {
  semiconductor: { label: 'Advanced Manufacturing', color: 'bg-blue-100 text-blue-800' },
  semiconductors: { label: 'Advanced Manufacturing', color: 'bg-blue-100 text-blue-800' },
  robotics: { label: 'Advanced Manufacturing', color: 'bg-blue-100 text-blue-800' },
  aerospace: { label: 'Advanced Manufacturing', color: 'bg-blue-100 text-blue-800' },
  'space-aerospace': { label: 'Advanced Manufacturing', color: 'bg-blue-100 text-blue-800' },
  battery: { label: 'Energy', color: 'bg-green-100 text-green-800' },
  solar: { label: 'Energy', color: 'bg-green-100 text-green-800' },
  'grid-transmission': { label: 'Energy', color: 'bg-green-100 text-green-800' },
  'smr-nuclear': { label: 'Energy', color: 'bg-green-100 text-green-800' },
  hydrogen: { label: 'Energy', color: 'bg-green-100 text-green-800' },
  defense: { label: 'Defense', color: 'bg-red-100 text-red-800' },
  hypersonics: { label: 'Defense', color: 'bg-red-100 text-red-800' },
  'rare-earth': { label: 'Critical Materials', color: 'bg-amber-100 text-amber-800' },
}

const signalTypeLabels: Record<string, string> = {
  site_search: '🔥 Site Search',
  SITE_SEARCH: '🔥 Site Search',
  expansion_announcement: 'Expansion',
  INVESTMENT_PLAN_ANNOUNCED: 'Expansion',
  new_facility: 'New Facility',
  funding_round: 'Funding',
  FUNDING_LADDER: 'Funding',
  contract_award: 'Contract',
  CONTRACT_WIN: 'Contract',
  hiring_surge: 'Hiring',
  partnership: 'Partnership',
  acquisition: 'Acquisition',
  earnings_signal: 'Earnings Signal',
  facility_opening: 'Facility Opening',
  regulatory_approval: 'Regulatory',
  REGULATORY_MILESTONE: 'Regulatory',
}

export function SignalCard({ signal, industry, segment }: SignalCardProps) {
  const company = signal.companies
  if (!company) return null

  const industryKey = industry?.toLowerCase().replace(/\s+/g, '-') || ''
  const tag = highLevelTags[industryKey] || { label: 'Signal Watch', color: 'bg-slate-100 text-slate-800' }
  
  const isSiteSearch = signal.signal_type === 'site_search'
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <Link href={`/companies/${company.slug}`}>
      <Card className={`h-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
        isSiteSearch ? 'ring-2 ring-red-400 bg-red-50/30' : ''
      }`}>
        <CardContent className="p-4">
          {/* Header: Logo + Tags */}
          <div className="flex items-start gap-3 mb-3">
            <CompanyLogo 
              website={company.website} 
              name={company.name} 
              size="md"
            />
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex flex-wrap gap-1.5 mb-1">
                <Badge variant="outline" className={`text-xs whitespace-nowrap ${tag.color}`}>
                  {tag.label}
                </Badge>
                {segment && (
                  <Badge variant="outline" className="text-xs bg-slate-50 max-w-[140px] truncate">
                    {segment}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Company Name + Date */}
          <div className="mb-2">
            <h3 className="font-semibold text-slate-900 truncate">{company.name}</h3>
            <p className="text-xs text-slate-500">{formatDate(signal.signal_date)}</p>
          </div>

          {/* Signal Type Badge */}
          <div className="mb-2">
            {isSiteSearch ? (
              <Badge className="bg-red-600 text-white">
                <Flame className="w-3 h-3 mr-1" />
                GOLD LEAD
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs max-w-full truncate">
                {signalTypeLabels[signal.signal_type] || signal.signal_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </Badge>
            )}
          </div>

          {/* Signal Title (Opportunity Blurb) */}
          <p className="text-sm text-slate-600 line-clamp-2">
            {signal.title}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
