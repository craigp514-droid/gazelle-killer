'use client'

import { useState, useEffect } from 'react'
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
  const supabase = createClient()

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

    await supabase
      .from('user_bookmarks')
      .insert({
        user_id: user.id,
        company_id: companyId,
        notes: note || null,
      })
    
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

  return (
    <>
      {starButton}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowModal(false)}
          />
          
          {/* Modal container - centered */}
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Modal content */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              {/* Close button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Header */}
              <div className="mb-6 pr-8">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-900">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  Add to Favorites
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {companyName ? (
                    <>Adding <span className="font-medium text-slate-700">{companyName}</span> to your watchlist.</>
                  ) : (
                    <>Add a note to remember why you're tracking this company.</>
                  )}
                </p>
              </div>
              
              {/* Note input */}
              <div className="mb-6">
                <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-2">
                  Note (optional)
                </label>
                <textarea
                  id="note"
                  placeholder="e.g., Follow up after Q2 earnings, Potential site visit candidate..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-slate-500 mt-2">
                  This helps you remember why this company matters.
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                  className="text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addFavorite}
                  disabled={isLoading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  <Star className="h-4 w-4 mr-2 fill-white" />
                  {isLoading ? 'Saving...' : 'Save to Favorites'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
