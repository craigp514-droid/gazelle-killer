import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  Cpu, 
  Cog, 
  Battery, 
  Rocket, 
  Shield, 
  Gem, 
  Heart,
  Building2,
  ArrowRight,
  Sparkles
} from 'lucide-react'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  cpu: Cpu,
  cog: Cog,
  battery: Battery,
  rocket: Rocket,
  shield: Shield,
  gem: Gem,
  heart: Heart,
}

export default async function ExplorePage() {
  const supabase = await createClient()

  // Get industries with company counts
  const { data: industries } = await supabase
    .from('industries')
    .select('*')
    .order('display_order')

  // Get company counts per industry
  const { data: segments } = await supabase
    .from('segments')
    .select('id, industry_id')

  const { data: companySegments } = await supabase
    .from('company_segments')
    .select('company_id, segment_id')

  // Calculate counts
  const segmentToIndustry: Record<string, string> = {}
  segments?.forEach(s => {
    if (s.industry_id) segmentToIndustry[s.id] = s.industry_id
  })

  const industryCompanyCounts: Record<string, Set<string>> = {}
  companySegments?.forEach(cs => {
    const industryId = segmentToIndustry[cs.segment_id]
    if (industryId) {
      if (!industryCompanyCounts[industryId]) industryCompanyCounts[industryId] = new Set()
      industryCompanyCounts[industryId].add(cs.company_id)
    }
  })

  const highGrowthIndustries = industries?.filter(i => !i.is_coming_soon) || []
  const legacyIndustries = industries?.filter(i => i.is_coming_soon) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Explore Industries</h1>
        <p className="text-slate-600 mt-1">
          Browse high-growth companies by industry. Click a card to see all companies in that sector.
        </p>
      </div>

      {/* View All Option */}
      <Link
        href="/companies"
        className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">View Entire Database</h3>
            <p className="text-sm text-orange-600">Browse all companies across all industries</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-orange-500 group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* High Growth Industries */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">High Growth Industries</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highGrowthIndustries.map((industry) => {
            const IconComponent = industry.icon ? iconMap[industry.icon] : Building2
            const companyCount = industryCompanyCounts[industry.id]?.size || 0
            
            return (
              <Link
                key={industry.id}
                href={`/companies?industry=${industry.slug}`}
                className="group relative overflow-hidden rounded-xl border bg-white p-6 hover:shadow-lg transition-all hover:border-slate-300"
              >
                {/* Background accent */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"
                  style={{ backgroundColor: industry.color || '#64748b' }}
                />
                
                <div className="relative">
                  {/* Icon */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
                    style={{ backgroundColor: `${industry.color}20` || '#f1f5f9' }}
                  >
                    {IconComponent && (
                      <IconComponent 
                        className="h-6 w-6" 
                        style={{ color: industry.color || '#64748b' }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold text-slate-900 group-hover:text-orange-500 transition-colors">
                    {industry.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {industry.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{companyCount}</span> companies
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Legacy Industries (Coming Soon) */}
      {legacyIndustries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Legacy Industries</h2>
          <p className="text-sm text-slate-500 mb-4">
            Traditional manufacturing sectors — coming soon based on client demand.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {legacyIndustries.map((industry) => {
              const IconComponent = industry.icon ? iconMap[industry.icon] : Building2
              
              return (
                <div
                  key={industry.id}
                  className="relative overflow-hidden rounded-xl border bg-slate-50 p-6 opacity-60"
                >
                  <div className="relative">
                    {/* Icon */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 mb-4">
                      {IconComponent && (
                        <IconComponent className="h-6 w-6 text-slate-400" />
                      )}
                    </div>

                    {/* Content */}
                    <h3 className="font-semibold text-slate-600">{industry.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">{industry.description}</p>

                    {/* Coming Soon Badge */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
