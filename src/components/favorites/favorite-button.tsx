'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [showDialog, setShowDialog] = useState(false)
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

  const handleClick = async () => {
    if (isFavorited) {
      // Remove favorite immediately
      await removeFavorite()
    } else {
      // Show dialog to add note
      setShowDialog(true)
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

  const addFavorite = async (withNote: string) => {
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
        notes: withNote || null,
      })
    
    setIsFavorited(true)
    setNote(withNote)
    setIsLoading(false)
    setShowDialog(false)
  }

  if (variant === 'icon') {
    return (
      <>
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
        
        <FavoriteDialog 
          open={showDialog}
          onOpenChange={setShowDialog}
          companyName={companyName}
          note={note}
          onNoteChange={setNote}
          onSave={addFavorite}
          isLoading={isLoading}
        />
      </>
    )
  }

  return (
    <>
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

      <FavoriteDialog 
        open={showDialog}
        onOpenChange={setShowDialog}
        companyName={companyName}
        note={note}
        onNoteChange={setNote}
        onSave={addFavorite}
        isLoading={isLoading}
      />
    </>
  )
}

function FavoriteDialog({
  open,
  onOpenChange,
  companyName,
  note,
  onNoteChange,
  onSave,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyName?: string
  note: string
  onNoteChange: (note: string) => void
  onSave: (note: string) => void
  isLoading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Add to Favorites
          </DialogTitle>
          <DialogDescription>
            {companyName ? (
              <>Adding <strong>{companyName}</strong> to your watchlist.</>
            ) : (
              <>Add a note to remember why you're tracking this company.</>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2">
          <label htmlFor="note" className="text-sm font-medium text-slate-700">
            Note (optional)
          </label>
          <Textarea
            id="note"
            placeholder="e.g., Follow up after Q2 earnings, Potential site visit candidate, Check back when funding closes..."
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-slate-500">
            This helps you remember why this company matters when you review later.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave(note)}
            disabled={isLoading}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Star className="h-4 w-4 mr-2 fill-white" />
            {isLoading ? 'Saving...' : 'Save to Favorites'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
