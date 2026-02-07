'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  companyId: string
  initialFavorited?: boolean
  variant?: 'button' | 'icon'
  className?: string
}

export function FavoriteButton({ 
  companyId, 
  initialFavorited = false,
  variant = 'button',
  className 
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Check initial favorite status
  useEffect(() => {
    async function checkFavorite() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single()

      setIsFavorited(!!data)
    }
    checkFavorite()
  }, [companyId, supabase])

  const toggleFavorite = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setIsLoading(false)
      return
    }

    if (isFavorited) {
      // Remove favorite
      await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('company_id', companyId)
      
      setIsFavorited(false)
    } else {
      // Add favorite
      await supabase
        .from('user_bookmarks')
        .insert({
          user_id: user.id,
          company_id: companyId,
        })
      
      setIsFavorited(true)
    }
    
    setIsLoading(false)
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleFavorite}
        disabled={isLoading}
        className={cn(
          'p-1 rounded hover:bg-slate-100 transition-colors disabled:opacity-50',
          className
        )}
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className={cn(
            'h-5 w-5 transition-colors',
            isFavorited 
              ? 'fill-yellow-400 text-yellow-400' 
              : 'text-slate-400 hover:text-yellow-400'
          )}
        />
      </button>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={toggleFavorite}
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
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-slate-600'
        )}
      />
      {isFavorited ? 'Favorited' : 'Add to Favorites'}
    </Button>
  )
}
