import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Building2, ArrowRight } from 'lucide-react'

export default async function SegmentsPage() {
  const supabase = await createClient()

  const { data: segments } = await supabase
    .from('segments')
    .select('*')
    .order('display_order')

  // Get company counts per segment
  const { data: companyCounts } = await supabase
    .from('company_segments')
    .select('segment_id')

  const segmentCounts = companyCounts?.reduce((acc: Record<string, number>, curr) => {
    acc[curr.segment_id] = (acc[curr.segment_id] || 0) + 1
    return acc
  }, {}) || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Segments</h1>
        <p className="text-slate-600">
          Browse companies by industry segment
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments?.map((segment) => (
          <Link key={segment.id} href={`/segments/${segment.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: segment.color ? `${segment.color}20` : '#f1f5f9' }}
                  >
                    <Building2
                      className="h-5 w-5"
                      style={{ color: segment.color || '#64748b' }}
                    />
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>
                <CardTitle className="text-lg">{segment.name}</CardTitle>
                <CardDescription>{segment.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">
                  {segmentCounts[segment.id] || 0} companies
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
