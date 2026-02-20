'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportFavoritesButtonProps {
  favorites: Array<{
    company: {
      name: string
      slug: string
      website: string | null
      hq_city: string | null
      hq_state: string | null
      tier: string | null
      composite_score: number | null
      messaging_hook: string | null
    }
    notes: string | null
    created_at: string
  }>
}

export function ExportFavoritesButton({ favorites }: ExportFavoritesButtonProps) {
  const handleExport = () => {
    if (!favorites || favorites.length === 0) return

    const headers = ['Company Name', 'Website', 'Location', 'Tier', 'Score', 'Messaging Hook', 'Notes', 'Date Added']
    
    const rows = favorites.map(f => {
      const c = f.company
      return [
        c.name || '',
        c.website || '',
        [c.hq_city, c.hq_state].filter(Boolean).join(', '),
        c.tier || '',
        c.composite_score?.toString() || '',
        (c.messaging_hook || '').replace(/"/g, '""'),
        (f.notes || '').replace(/"/g, '""'),
        new Date(f.created_at).toLocaleDateString()
      ].map(v => v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v)
    })

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `favorites-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={!favorites || favorites.length === 0}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  )
}
