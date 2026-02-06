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
  ChevronDown,
  Battery,
  Plane,
  Atom,
  Rocket,
  Zap,
  Truck,
  Cog,
  Cpu,
  Sun,
  Shield,
  Heart,
  Brain
} from 'lucide-react'
import { useState } from 'react'
import { Segment } from '@/types/database'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  battery: Battery,
  plane: Plane,
  cube: Atom,
  rocket: Rocket,
  zap: Zap,
  truck: Truck,
  cog: Cog,
  cpu: Cpu,
  sun: Sun,
  shield: Shield,
  heart: Heart,
  brain: Brain,
}

interface SidebarProps {
  segments: Segment[]
}

export function Sidebar({ segments }: SidebarProps) {
  const pathname = usePathname()
  const [segmentsOpen, setSegmentsOpen] = useState(true)

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

            {/* Segments Section */}
            <li className="pt-4">
              <button
                onClick={() => setSegmentsOpen(!segmentsOpen)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <span className="flex items-center gap-3">
                  <Building2 className="h-5 w-5" />
                  Segments
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    segmentsOpen && 'rotate-180'
                  )}
                />
              </button>
              {segmentsOpen && (
                <ul className="mt-1 space-y-1 pl-4">
                  {segments.map((segment) => {
                    const isActive = pathname === `/segments/${segment.slug}`
                    const IconComponent = segment.icon ? iconMap[segment.icon] : Building2
                    return (
                      <li key={segment.id}>
                        <Link
                          href={`/segments/${segment.slug}`}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          )}
                        >
                          {IconComponent && (
                            <IconComponent 
                              className="h-4 w-4" 
                              style={{ color: segment.color || undefined }}
                            />
                          )}
                          <span className="truncate">{segment.name}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          </ul>
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
