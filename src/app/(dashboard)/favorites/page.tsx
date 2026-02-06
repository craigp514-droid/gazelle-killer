import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's bookmarks with company info
  const { data: bookmarks } = await supabase
    .from('user_bookmarks')
    .select('*, companies(*)')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
        <p className="text-slate-600">
          Companies you&apos;re tracking
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Saved Companies
          </CardTitle>
          <CardDescription>{bookmarks?.length || 0} favorites</CardDescription>
        </CardHeader>
        <CardContent>
          {bookmarks && bookmarks.length > 0 ? (
            <div className="space-y-4">
              {bookmarks.map((bookmark: any) => (
                <div
                  key={bookmark.id}
                  className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {bookmark.companies?.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {bookmark.companies?.hq_city}, {bookmark.companies?.hq_state}
                    </p>
                    {bookmark.notes && (
                      <p className="mt-1 text-sm text-slate-600">{bookmark.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-emerald-600">
                      {bookmark.companies?.composite_score}
                    </span>
                    <p className="text-xs text-slate-500">
                      Tier {bookmark.companies?.tier}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Star className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-medium text-slate-900">No favorites yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Star companies to add them to your watchlist.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
