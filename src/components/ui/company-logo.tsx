'use client'

import { useState } from 'react'
import { Building2 } from 'lucide-react'

interface CompanyLogoProps {
  website: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { container: 'h-10 w-10', icon: 'h-5 w-5', img: 'h-6 w-6' },
  md: { container: 'h-16 w-16', icon: 'h-8 w-8', img: 'h-10 w-10' },
  lg: { container: 'h-20 w-20', icon: 'h-10 w-10', img: 'h-14 w-14' },
}

function extractDomain(website: string | null): string | null {
  if (!website) return null
  try {
    // Handle URLs with or without protocol
    const url = website.startsWith('http') ? website : `https://${website}`
    const parsed = new URL(url)
    return parsed.hostname.replace('www.', '')
  } catch {
    // If URL parsing fails, try to clean up the string
    return website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  }
}

export function CompanyLogo({ website, name, size = 'md', className = '' }: CompanyLogoProps) {
  const [imgSrc, setImgSrc] = useState<'google' | 'fallback'>('google')
  const domain = extractDomain(website)
  const sizes = sizeMap[size]

  // If no website or all sources failed, show fallback
  if (!domain || imgSrc === 'fallback') {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-slate-100 ${sizes.container} ${className}`}>
        <Building2 className={`text-slate-400 ${sizes.icon}`} />
      </div>
    )
  }

  // Use Google's favicon service (more reliable)
  const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

  return (
    <div className={`flex items-center justify-center rounded-xl bg-white border border-slate-200 ${sizes.container} ${className}`}>
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={`object-contain ${sizes.img}`}
        onError={() => setImgSrc('fallback')}
      />
    </div>
  )
}
