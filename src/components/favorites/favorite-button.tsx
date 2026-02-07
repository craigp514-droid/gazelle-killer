'use client'

import { useState, useEffect } from 'react'
import { Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  companyId: string
  companyName?: string
  initialFavorited?: boolean
  variant?: 'button' | 'icon'
  className?: string
}

export function FavoriteButton({ 
  companyId, 
  companyName,
  initialFavorited = false,
  variant = 'button',
  className 
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
      
      {/* Custom Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          
          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 z-10">
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Add to Favorites
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {companyName ? (
                  <>Adding <strong>{companyName}</strong> to your watchlist.</>
                ) : (
                  <>Add a note to remember why you're tracking this company.</>
                )}
              </p>
            </div>
            
            {/* Note input */}
            <div className="mb-4">
              <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-1">
                Note (optional)
              </label>
              <Textarea
                id="note"
                placeholder="e.g., Follow up after Q2 earnings, Potential site visit candidate..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="resize-none w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                This helps you remember why this company matters.
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
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
      )}
    </>
  )
}
