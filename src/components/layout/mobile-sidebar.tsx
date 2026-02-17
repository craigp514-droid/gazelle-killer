'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Building2, 
  Radio, 
  Star, 
  Settings,
  Compass,
  List,
  TrendingUp,
  Shield,
  Menu,
  X
} from 'lucide-react'

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/explore', label: 'Explore Industries', icon: Compass },
    { href: '/companies', label: 'All Companies', icon: List },
    { href: '/projects', label: 'Project Intelligence', icon: TrendingUp },
    { href: '/favorites', label: 'Favorites', icon: Star },
    { href: '/signals', label: 'Signals Feed', icon: Radio },
  ]

  const closeMenu = () => setIsOpen(false)

  return (
    <>
      {/* Hamburger button - only visible on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-900 text-white shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar - slides in on mobile */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out',
          'lg:translate-x-0', // Always visible on desktop
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo + Close button */}
          <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
            <Image 
              src="/logo.jpg" 
              alt="SignalFeed" 
              width={180} 
              height={40}
              className="h-10 w-auto"
              priority
            />
            <button
              onClick={closeMenu}
              className="lg:hidden p-1 rounded hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
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
          </nav>

          {/* Admin & Settings */}
          <div className="border-t border-slate-800 p-3 space-y-1">
            <Link
              href="/admin"
              onClick={closeMenu}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/admin'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
            <Link
              href="/settings"
              onClick={closeMenu}
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
    </>
  )
}
