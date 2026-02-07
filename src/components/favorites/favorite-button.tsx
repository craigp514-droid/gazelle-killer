'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  companyId: string
  companyName?: string
  initialFavorited?: boolean
  variant?: 'button' | 'icon'
  className?: string
  onFavoriteChange?: (isFavorited: boolean, note: string | null) => void
}

export function FavoriteButton({ 
  companyId, 
  companyName,
  initialFavorited = false,
  variant = 'button',
  className,
  onFavoriteChange
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [note, setNote] = useState('')
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  // For portal rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check initial favorite status
  useEffect(() => {
    async function checkFavorite() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_bookmarks')
        .select('id, notes')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single()

      setIsFavorited(!!data)
      if (data?.notes) setNote(data.notes)
    }
    checkFavorite()
  }, [companyId, supabase])

  const handleClick = () => {
    if (isFavorited) {
      removeFavorite()
    } else {
      setShowModal(true)
    }
  }

  const removeFavorite = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setIsLoading(false)
      return
    }

    await supabase
      .from('user_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('company_id', companyId)
    
    setIsFavorited(false)
    setNote('')
    setIsLoading(false)
    onFavoriteChange?.(false, null)
  }

  const addFavorite = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setIsLoading(false)
      return
    }

    const { error } = await supabase
      .from('user_bookmarks')
      .insert({
        user_id: user.id,
        company_id: companyId,
        notes: note || null,
      })
    
    if (error) {
      console.error('Error saving favorite:', error)
    }
    
    setIsFavorited(true)
    setIsLoading(false)
    setShowModal(false)
    onFavoriteChange?.(true, note || null)
  }

  const starButton = variant === 'icon' ? (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'p-1.5 rounded-full transition-all disabled:opacity-50',
        isFavorited 
          ? 'bg-yellow-100 hover:bg-yellow-200' 
          : 'hover:bg-slate-100',
        className
      )}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={cn(
          'h-5 w-5 transition-colors',
          isFavorited 
            ? 'fill-yellow-500 text-yellow-500' 
            : 'text-slate-300 hover:text-yellow-400'
        )}
      />
    </button>
  ) : (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'gap-2',
        isFavorited && 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
        className
      )}
    >
      <Star
        className={cn(
          'h-4 w-4',
          isFavorited 
            ? 'fill-yellow-500 text-yellow-500' 
            : 'text-slate-600'
        )}
      />
      {isFavorited ? 'Favorited' : 'Add to Favorites'}
    </Button>
  )

  const modal = showModal && mounted ? createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop - SOLID black with opacity */}
      <div 
        onClick={() => setShowModal(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
      />
      
      {/* Modal content - SOLID white */}
      <div 
        style={{
          position: 'relative',
          zIndex: 100000,
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '420px',
          padding: '24px',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setShowModal(false)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '4px',
            color: '#9ca3af',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
          }}
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>
        
        {/* Header */}
        <div style={{ marginBottom: '24px', paddingRight: '32px' }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            color: '#0f172a',
            margin: 0,
          }}>
            <Star style={{ width: '20px', height: '20px', color: '#eab308', fill: '#eab308' }} />
            Add to Favorites
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            {companyName ? (
              <>Adding <strong style={{ color: '#334155' }}>{companyName}</strong> to your watchlist.</>
            ) : (
              <>Add a note to remember why you're tracking this company.</>
            )}
          </p>
        </div>
        
        {/* Note input */}
        <div style={{ marginBottom: '24px' }}>
          <label 
            htmlFor="favorite-note" 
            style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: 500, 
              color: '#334155',
              marginBottom: '8px',
            }}
          >
            Note (optional)
          </label>
          <textarea
            id="favorite-note"
            placeholder="e.g., Follow up after Q2 earnings, Potential site visit candidate..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
            This helps you remember why this company matters.
          </p>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={() => setShowModal(false)}
            disabled={isLoading}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#475569',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={addFavorite}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#eab308',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Star style={{ width: '16px', height: '16px', fill: '#ffffff' }} />
            {isLoading ? 'Saving...' : 'Save to Favorites'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      {starButton}
      {modal}
    </>
  )
}
