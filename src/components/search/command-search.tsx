'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Building2, ArrowRight, Loader2, CheckCircle, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
  slug: string
  hq_city: string | null
  hq_state: string | null
  tier: string
  composite_score: number
}

export function CommandSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Company[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setRequestSent(false)
    }
  }, [isOpen])

  // Search companies
  const searchCompanies = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, slug, hq_city, hq_state, tier, composite_score')
      .ilike('name', `%${searchQuery}%`)
      .order('composite_score', { ascending: false })
      .limit(8)

    if (!error && data) {
      setResults(data)
    }
    setIsSearching(false)
  }, [supabase])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCompanies(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, searchCompanies])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        navigateToCompany(results[selectedIndex].slug)
      }
    }
  }

  const navigateToCompany = (slug: string) => {
    setIsOpen(false)
    router.push(`/companies/${slug}`)
  }

  const requestCompany = async () => {
    if (!query.trim() || isRequesting) return

    setIsRequesting(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setIsRequesting(false)
      return
    }

    // Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    await supabase
      .from('company_requests')
      .insert({
        requested_name: query.trim(),
        requested_by: user.id,
        organization_id: profile?.organization_id,
      })

    setIsRequesting(false)
    setRequestSent(true)
  }

  const tierColors: Record<string, string> = {
    A: '#16a34a',
    B: '#ca8a04',
    C: '#64748b',
  }

  if (!mounted) return null

  const modal = isOpen ? createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        padding: '15vh 16px 16px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          zIndex: 100000,
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '560px',
          overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            borderBottom: '1px solid #e2e8f0',
            gap: '12px',
          }}
        >
          <Search style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search companies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              fontSize: '16px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
            }}
          />
          {isSearching && (
            <Loader2 style={{ width: '20px', height: '20px', color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
          )}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '4px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>ESC</span>
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {query.length >= 2 && results.length > 0 && (
            <div style={{ padding: '8px' }}>
              {results.map((company, index) => (
                <button
                  key={company.id}
                  onClick={() => navigateToCompany(company.slug)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: index === selectedIndex ? '#f1f5f9' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Building2 style={{ width: '20px', height: '20px', color: '#64748b' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{company.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {company.hq_city && company.hq_state ? `${company.hq_city}, ${company.hq_state}` : 'Location unknown'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: tierColors[company.tier] || '#64748b',
                        backgroundColor: `${tierColors[company.tier]}15` || '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Tier {company.tier}
                    </span>
                    <ArrowRight style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results - Request company */}
          {query.length >= 2 && !isSearching && results.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              {requestSent ? (
                <>
                  <CheckCircle style={{ width: '48px', height: '48px', color: '#16a34a', margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 8px' }}>
                    Request Submitted!
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                    We'll review "{query}" and add it if it meets our criteria.
                  </p>
                </>
              ) : (
                <>
                  <Building2 style={{ width: '48px', height: '48px', color: '#cbd5e1', margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 8px' }}>
                    Company not tracked yet
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px' }}>
                    We focus on high-growth companies with recent signals. Want us to look into this one?
                  </p>
                  <button
                    onClick={requestCompany}
                    disabled={isRequesting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#ffffff',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isRequesting ? 'not-allowed' : 'pointer',
                      opacity: isRequesting ? 0.7 : 1,
                    }}
                  >
                    {isRequesting ? (
                      <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Plus style={{ width: '16px', height: '16px' }} />
                    )}
                    {isRequesting ? 'Submitting...' : `Request "${query}"`}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Empty state */}
          {query.length < 2 && (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                Start typing to search companies...
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  ) : null

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#64748b',
          fontSize: '14px',
          minWidth: '240px',
        }}
      >
        <Search style={{ width: '16px', height: '16px' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>Search companies...</span>
        <span
          style={{
            fontSize: '12px',
            backgroundColor: '#ffffff',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
          }}
        >
          ⌘K
        </span>
      </button>
      {modal}
    </>
  )
}
