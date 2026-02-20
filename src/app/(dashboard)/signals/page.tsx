import { createClient } from '@/lib/supabase/server'
import { Radio } from 'lucide-react'
import { SignalCard } from '@/components/signals/signal-card'

export default async function SignalsPage() {
  const supabase = await createClient()

  // Get all signals
  const { data: signals } = await supabase
    .from('signals')
    .select('*, companies(name, slug, website)')
    .order('created_at', { ascending: false })
    .limit(100)

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

  // Total signals
  const { count: totalCount } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Radio className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-slate-900">Signal Feed</h1>
        </div>
        <p className="text-slate-600 mt-1">
          {totalCount || 0} signals across all tracked companies
        </p>
      </div>

      {/* Signal Cards Grid */}
      {signals && signals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {signals.map((signal: any) => (
            <div key={signal.id} className="min-w-0">
              <SignalCard
                signal={signal}
                industry={companyIndustryMap[signal.company_id]?.industry}
                segment={companyIndustryMap[signal.company_id]?.segment}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          No signals yet. The feed will populate as companies are tracked.
        </div>
      )}
    </div>
  )
}
