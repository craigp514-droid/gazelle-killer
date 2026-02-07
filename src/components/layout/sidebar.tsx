'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Building2, 
  Radio, 
  Star, 
  Settings,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Cog,
  Battery,
  Rocket,
  Shield,
  Gem,
  Heart,
  Sparkles
} from 'lucide-react'
import { useState } from 'react'

// Icon mapping for industries
const industryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  cpu: Cpu,
  cog: Cog,
  battery: Battery,
  rocket: Rocket,
  shield: Shield,
  gem: Gem,
  heart: Heart,
}

export type Industry = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  display_order: number
  is_coming_soon: boolean
}

export type Segment = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  display_order: number
  industry_id: string | null
}

interface SidebarProps {
  industries: Industry[]
  segments: Segment[]
}

export function Sidebar({ industries, segments }: SidebarProps) {
  const pathname = usePathname()
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null)

  // Check if we're currently viewing an industry or segment page
  const currentIndustrySlug = pathname.split('/')[1]
  const currentSegmentSlug = pathname.split('/')[2]

  // Get segments for selected industry
  const industrySegments = selectedIndustry 
    ? segments.filter(s => s.industry_id === selectedIndustry.id)
    : []

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/signals', label: 'Signals Feed', icon: Radio },
    { href: '/favorites', label: 'Favorites', icon: Star },
  ]

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 text-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold">Gazelle Killer</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Industries Section */}
          <div className="mt-6">
            <div className="px-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Industries
              </span>
            </div>

            {/* Show industry list or segment drill-down */}
            {selectedIndustry ? (
              // Segment view (drilled into an industry)
              <div className="space-y-1">
                {/* Back button */}
                <button
                  onClick={() => setSelectedIndustry(null)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Industries
                </button>

                {/* Industry header */}
                <div className="px-3 py-2">
                  <span 
                    className="text-sm font-semibold"
                    style={{ color: selectedIndustry.color || '#fff' }}
                  >
                    {selectedIndustry.name}
                  </span>
                </div>

                {/* ALL option */}
                <Link
                  href={`/${selectedIndustry.slug}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname === `/${selectedIndustry.slug}`
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Sparkles className="h-4 w-4" style={{ color: selectedIndustry.color || undefined }} />
                  All {selectedIndustry.name}
                </Link>

                {/* Segments list */}
                {industrySegments
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((segment) => {
                    const isActive = pathname === `/${selectedIndustry.slug}/${segment.slug}`
                    return (
                      <Link
                        key={segment.id}
                        href={`/${selectedIndustry.slug}/${segment.slug}`}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        <span className="truncate">{segment.name}</span>
                      </Link>
                    )
                  })}
              </div>
            ) : (
              // Industry list view
              <ul className="space-y-1">
                {industries
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((industry) => {
                    const IconComponent = industry.icon ? industryIconMap[industry.icon] : Building2
                    const isActive = currentIndustrySlug === industry.slug
                    
                    if (industry.is_coming_soon) {
                      return (
                        <li key={industry.id}>
                          <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 cursor-not-allowed">
                            <div className="flex items-center gap-3">
                              {IconComponent && (
                                <IconComponent className="h-4 w-4" />
                              )}
                              <span>{industry.name}</span>
                            </div>
                            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">Soon</span>
                          </div>
                        </li>
                      )
                    }

                    return (
                      <li key={industry.id}>
                        <button
                          onClick={() => setSelectedIndustry(industry)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {IconComponent && (
                              <IconComponent 
                                className="h-4 w-4" 
                                style={{ color: industry.color || undefined }}
                              />
                            )}
                            <span>{industry.name}</span>
                          </div>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </li>
                    )
                  })}
              </ul>
            )}
          </div>
        </nav>

        {/* Settings */}
        <div className="border-t border-slate-800 p-3">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/settings'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>
      </div>
    </aside>
  )
}
