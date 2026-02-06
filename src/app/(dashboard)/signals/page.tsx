import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Radio, ExternalLink } from 'lucide-react'

export default async function SignalsPage() {
  const supabase = await createClient()

  // Get all signals with company info
  const { data: signals } = await supabase
    .from('signals')
    .select('*, companies(name, slug)')
    .order('signal_date', { ascending: false })
    .limit(50)

  const signalTypeColors: Record<string, string> = {
    funding_round: 'bg-green-100 text-green-800',
    hiring_surge: 'bg-blue-100 text-blue-800',
    new_facility: 'bg-purple-100 text-purple-800',
    contract_award: 'bg-yellow-100 text-yellow-800',
    partnership: 'bg-indigo-100 text-indigo-800',
    regulatory_approval: 'bg-teal-100 text-teal-800',
    product_launch: 'bg-pink-100 text-pink-800',
    acquisition: 'bg-orange-100 text-orange-800',
    layoff: 'bg-red-100 text-red-800',
    facility_closure: 'bg-red-100 text-red-800',
  }

  const formatSignalType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Signals Feed</h1>
        <p className="text-slate-600">
          All recent signals from tracked companies
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-600" />
            Recent Signals
          </CardTitle>
          <CardDescription>{signals?.length || 0} signals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {signals && signals.length > 0 ? (
              signals.map((signal: any) => (
                <div
                  key={signal.id}
                  className="flex items-start justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/companies/${signal.companies?.slug}`}
                        className="font-medium text-slate-900 hover:text-emerald-600"
                      >
                        {signal.companies?.name}
                      </Link>
                      <Badge
                        variant="secondary"
                        className={signalTypeColors[signal.signal_type] || 'bg-slate-100'}
                      >
                        {formatSignalType(signal.signal_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700">{signal.title}</p>
                    {signal.summary && (
                      <p className="text-sm text-slate-500">{signal.summary}</p>
                    )}
                    {signal.source_url && (
                      <a
                        href={signal.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                      >
                        {signal.source_name || 'Source'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-slate-500">
                      {new Date(signal.signal_date).toLocaleDateString()}
                    </span>
                    {signal.signal_strength && (
                      <div className="mt-1 flex justify-end gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${
                              i < signal.signal_strength
                                ? 'bg-emerald-500'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No signals yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
