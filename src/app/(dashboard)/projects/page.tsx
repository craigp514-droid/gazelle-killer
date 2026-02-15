import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  DollarSign, 
  Building2, 
  Users, 
  MapPin,
  TrendingUp,
  Lightbulb,
  Globe
} from 'lucide-react'

export default async function ProjectIntelligencePage() {
  const supabase = await createClient()

  // Get all projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*, companies(name, slug)')
    .order('capex_millions', { ascending: false, nullsFirst: false })

  // Calculate hero stats
  const totalProjects = projects?.length || 0
  const totalCapex = projects?.reduce((sum, p) => sum + (p.capex_millions || 0), 0) || 0
  const totalJobs = projects?.reduce((sum, p) => sum + (p.jobs_announced || 0), 0) || 0
  const uniqueStates = new Set(projects?.map(p => p.location_state).filter(Boolean)).size

  // Sector breakdown
  const bySector: Record<string, { count: number; jobs: number; capex: number }> = {}
  projects?.forEach(p => {
    const sector = p.sector || 'Other'
    if (!bySector[sector]) bySector[sector] = { count: 0, jobs: 0, capex: 0 }
    bySector[sector].count++
    bySector[sector].jobs += p.jobs_announced || 0
    bySector[sector].capex += p.capex_millions || 0
  })

  const sectorData = Object.entries(bySector)
    .map(([sector, data]) => ({ sector, ...data }))
    .sort((a, b) => b.capex - a.capex)
    .slice(0, 10)

  // Mega deals ($10B+)
  const megaDeals = projects?.filter(p => (p.capex_millions || 0) >= 10000) || []

  // Jobs per $M by sector (labor intensity) - minimum 20 projects
  const laborIntensity = Object.entries(bySector)
    .filter(([_, d]) => d.capex > 0 && d.jobs > 0 && d.count >= 20)
    .map(([sector, d]) => ({
      sector,
      ratio: d.jobs / d.capex,
      jobs: d.jobs,
      capex: d.capex,
      count: d.count
    }))
    .sort((a, b) => b.ratio - a.ratio)
  
  // Top job creating sectors (absolute numbers)
  const topJobSectors = Object.entries(bySector)
    .filter(([_, d]) => d.count >= 20)
    .map(([sector, d]) => ({ sector, ...d }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 5)

  // FDI by source country
  const fdiProjects = projects?.filter(p => p.fdi_origin) || []
  const fdiByCountry: Record<string, { count: number; capex: number; jobs: number }> = {}
  fdiProjects.forEach(p => {
    const country = p.fdi_origin || 'Unknown'
    if (!fdiByCountry[country]) fdiByCountry[country] = { count: 0, capex: 0, jobs: 0 }
    fdiByCountry[country].count++
    fdiByCountry[country].capex += p.capex_millions || 0
    fdiByCountry[country].jobs += p.jobs_announced || 0
  })
  const topFdiCountries = Object.entries(fdiByCountry)
    .map(([country, data]) => ({ country, ...data }))
    .sort((a, b) => b.capex - a.capex)
    .slice(0, 6)
  const totalFdiCapex = fdiProjects.reduce((s, p) => s + (p.capex_millions || 0), 0)

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}T`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}B`
    return `$${value.toFixed(0)}M`
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toLocaleString()
  }

  // Calculate sector percentages for chart
  const topSectorsCapex = sectorData.slice(0, 4).reduce((sum, s) => sum + s.capex, 0)
  const otherCapex = totalCapex - topSectorsCapex

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Project Intelligence</h1>
        <p className="text-slate-600 mt-1">
          Real-time insights from {totalProjects.toLocaleString()} announced facility projects
          <span className="text-slate-400 ml-2">• Since October 2025</span>
        </p>
      </div>

      {/* Hero Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{formatCurrency(totalCapex)}</p>
                <p className="text-white/80 text-sm">Total Capex</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{totalProjects.toLocaleString()}</p>
                <p className="text-white/80 text-sm">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{formatNumber(totalJobs)}</p>
                <p className="text-white/80 text-sm">Jobs Announced</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{uniqueStates}</p>
                <p className="text-white/80 text-sm">States</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Sector Breakdown - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Capex by Sector
            </CardTitle>
            <CardDescription>
              Where the money is going — since October 2025
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sectorData.map((sector, i) => {
                const percentage = (sector.capex / totalCapex) * 100
                const colors = [
                  'bg-emerald-500',
                  'bg-blue-500',
                  'bg-purple-500',
                  'bg-orange-500',
                  'bg-pink-500',
                  'bg-cyan-500',
                  'bg-yellow-500',
                  'bg-red-500',
                  'bg-indigo-500',
                  'bg-slate-500'
                ]
                return (
                  <div key={sector.sector} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{sector.sector}</span>
                      <span className="text-slate-500">
                        {formatCurrency(sector.capex)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[i]} rounded-full transition-all`}
                        style={{ width: `${Math.max(percentage, 1)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{sector.count} projects</span>
                      <span>{formatNumber(sector.jobs)} jobs</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Intelligence Cards - Right column */}
        <div className="space-y-4">
          {/* Labor Intensity Insight - Expanded */}
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Jobs per $1M Invested
              </CardTitle>
              <CardDescription className="text-purple-600 text-xs">
                Sectors with 20+ projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {laborIntensity.map((s, i) => (
                  <div key={s.sector} className="flex justify-between text-sm">
                    <span className={i < 3 ? "text-purple-800 font-medium" : "text-purple-600"}>
                      {s.sector}
                    </span>
                    <span className={i < 3 ? "font-semibold text-purple-900" : "text-purple-700"}>
                      {s.ratio.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-purple-500 mt-3 pt-2 border-t border-purple-200">
                Higher = more labor-intensive • Lower = capital-intensive
              </p>
            </CardContent>
          </Card>

          {/* Aerospace = Job Machine */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Aerospace = Job Machine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-900">
                {formatNumber(bySector['Aerospace & Defense']?.jobs || 0)}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                jobs from only <span className="font-semibold">{formatCurrency(bySector['Aerospace & Defense']?.capex || 0)}</span> capex
              </p>
              <p className="text-xs text-blue-600 mt-2 pt-2 border-t border-blue-200">
                {((bySector['Aerospace & Defense']?.jobs || 0) / (bySector['Aerospace & Defense']?.capex || 1)).toFixed(1)} jobs per $1M — <span className="font-medium">85x more than Semiconductors</span>
              </p>
            </CardContent>
          </Card>

          {/* Capital Sinks Insight */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                The Capital Sink Reality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-900">
                0.04
              </p>
              <p className="text-sm text-amber-700 mt-1">
                jobs per $1M in <span className="font-semibold">Semiconductors & Data Centers</span>
              </p>
              <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-amber-200">
                These sectors absorb <span className="font-medium">{((((bySector['Semiconductors']?.capex || 0) + (bySector['Data Centers']?.capex || 0)) / totalCapex) * 100).toFixed(0)}% of capex</span> but create minimal direct jobs
              </p>
            </CardContent>
          </Card>

          {/* FDI Source Countries */}
          <Card className="border-cyan-200 bg-cyan-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-cyan-800 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Foreign Investment
              </CardTitle>
              <CardDescription className="text-cyan-600 text-xs">
                {fdiProjects.length} projects • {formatCurrency(totalFdiCapex)} ({((totalFdiCapex / totalCapex) * 100).toFixed(0)}% of total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {topFdiCountries.map((c, i) => (
                  <div key={c.country} className="flex justify-between text-sm">
                    <span className={i < 2 ? "text-cyan-800 font-medium" : "text-cyan-700"}>
                      {c.country}
                    </span>
                    <span className={i < 2 ? "font-semibold text-cyan-900" : "text-cyan-700"}>
                      {formatCurrency(c.capex)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-cyan-500 mt-3 pt-2 border-t border-cyan-200">
                Taiwan alone = {((fdiByCountry['Taiwan']?.capex || 0) / totalCapex * 100).toFixed(0)}% of all capex (TSMC)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mega Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Mega Deals
            <Badge variant="secondary" className="ml-2">${'10B+'}</Badge>
          </CardTitle>
          <CardDescription>
            {megaDeals.length} projects with $10B+ investment — since October 2025
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-slate-500">
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3 pr-4">State</th>
                  <th className="pb-3 pr-4">Sector</th>
                  <th className="pb-3 pr-4 text-right">Capex</th>
                  <th className="pb-3 pr-4 text-right">Jobs</th>
                  <th className="pb-3">FDI</th>
                </tr>
              </thead>
              <tbody>
                {megaDeals.slice(0, 15).map((project) => (
                  <tr key={project.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4">
                      {project.companies?.slug ? (
                        <Link 
                          href={`/companies/${project.companies.slug}`}
                          className="font-medium text-slate-900 hover:text-emerald-600"
                        >
                          {project.companies?.name || 'Unknown'}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-900">
                          {project.companies?.name || 'Unknown'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {project.location_state || '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">
                        {project.sector || 'Other'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(project.capex_millions || 0)}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-600">
                      {project.jobs_announced ? formatNumber(project.jobs_announced) : '—'}
                    </td>
                    <td className="py-3">
                      {project.fdi_origin ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                          FDI
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">Domestic</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {megaDeals.length > 15 && (
            <p className="text-sm text-slate-500 mt-4 text-center">
              Showing top 15 of {megaDeals.length} mega deals
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
