import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { 
  Globe, 
  MapPin, 
  Users, 
  Calendar,
  ExternalLink,
  TrendingUp,
  MessageSquare,
  Star,
  Linkedin,
  Building2,
  Briefcase
} from 'lucide-react'
import { FavoriteButton } from '@/components/favorites/favorite-button'
import { CompanyLogo } from '@/components/ui/company-logo'
import { ExpandableText } from '@/components/ui/expandable-text'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Get company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!company) {
    notFound()
  }

  // Get segments for this company
  const { data: companySegments } = await supabase
    .from('company_segments')
    .select('segment_id, is_primary, segments(*)')
    .eq('company_id', company.id)

  // Get signals for this company
  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .eq('company_id', company.id)
    .order('signal_date', { ascending: false })

  // Get projects for this company
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', company.id)
    .order('announcement_date', { ascending: false })

  // Get score components
  const { data: scoreComponents } = await supabase
    .from('score_components')
    .select('*')
    .eq('company_id', company.id)

  // Check if company is favorited and get user's note
  const { data: { user } } = await supabase.auth.getUser()
  const { data: favorite } = await supabase
    .from('user_bookmarks')
    .select('id, notes, created_at')
    .eq('user_id', user?.id)
    .eq('company_id', company.id)
    .single()
  
  const isFavorited = !!favorite
  const userNote = favorite?.notes
  const favoritedAt = favorite?.created_at

  const tierColors = {
    A: 'bg-green-100 text-green-800 border-green-200',
    B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    C: 'bg-slate-100 text-slate-800 border-slate-200',
  }

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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <CompanyLogo website={company.website} name={company.name} size="md" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
              {company.website && (
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-emerald-600"
                >
                  <Globe className="h-4 w-4" />
                  {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {company.hq_city}, {company.hq_state}
              </span>
              {company.employee_count && (
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {company.employee_count.toLocaleString()} employees
                </span>
              )}
              {company.founded_year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Founded {company.founded_year}
                </span>
              )}
            </div>
          </div>
        </div>
        <FavoriteButton companyId={company.id} companyName={company.name} initialFavorited={isFavorited} />
      </div>

      {/* Segments */}
      <div className="flex flex-wrap gap-2">
        {companySegments?.map((cs: any) => (
          <Link key={cs.segment_id} href={`/companies?segment=${cs.segments?.slug}`}>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-slate-50"
              style={{
                borderColor: cs.segments?.color || undefined,
                color: cs.segments?.color || undefined,
              }}
            >
              {cs.segments?.name}
              {cs.is_primary && ' (Primary)'}
            </Badge>
          </Link>
        ))}
        {company.ownership && (
          <Badge variant="secondary">
            {company.ownership}
            {company.ticker && ` — ${company.ticker}`}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Score Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Score & Tier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold text-emerald-600">
                    {company.composite_score}
                  </p>
                  <p className="text-sm text-slate-500">Composite Score</p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-lg px-4 py-2 ${tierColors[company.tier as keyof typeof tierColors]}`}
                >
                  Tier {company.tier}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Score Breakdown</p>
                {scoreComponents && scoreComponents.length > 0 ? (
                  scoreComponents.map((component: any) => (
                    <div key={component.id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 capitalize">
                        {component.component_name.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium">{component.component_score}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No score breakdown available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messaging Hook */}
          {company.messaging_hook && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  <MessageSquare className="h-5 w-5" />
                  Messaging Hook
                </CardTitle>
                <CardDescription className="text-emerald-700">
                  Suggested outreach angle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-emerald-900">{company.messaging_hook}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {company.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{company.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* My Notes (user's personal note) */}
          {isFavorited && userNote && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                  My Notes
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  Added {favoritedAt ? new Date(favoritedAt).toLocaleDateString() : 'to favorites'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-900 whitespace-pre-wrap">{userNote}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Signal Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Signal Timeline</CardTitle>
              <CardDescription>
                {signals?.length || 0} signals tracked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {signals && signals.length > 0 ? (
                  signals.map((signal: any) => (
                    <div
                      key={signal.id}
                      className="relative border-l-2 border-slate-200 pl-6 pb-6 last:pb-0"
                    >
                      <div
                        className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white"
                        style={{
                          backgroundColor: signal.is_negative ? '#ef4444' : '#10b981',
                        }}
                      />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className={signalTypeColors[signal.signal_type] || 'bg-slate-100'}
                          >
                            {formatSignalType(signal.signal_type)}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            {new Date(signal.signal_date).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-medium text-slate-900">{signal.title}</h4>
                        {signal.summary && (
                          <p className="text-sm text-slate-600">{signal.summary}</p>
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
                        {signal.signal_strength && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Strength:</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-2 w-2 rounded-full ${
                                    i < signal.signal_strength
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No signals recorded yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Past Projects */}
          {projects && projects.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-600" />
                  Past Projects
                </CardTitle>
                <CardDescription>
                  {projects.length} announced project{projects.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.map((project: any) => (
                    <div
                      key={project.id}
                      className="border rounded-lg p-4 bg-slate-50 space-y-3"
                    >
                      {/* Location & Date Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span className="font-medium text-slate-900">
                            {project.location_city && project.location_state
                              ? `${project.location_city}, ${project.location_state}`
                              : project.location_state || project.location_city || 'Location TBD'}
                          </span>
                          {project.fdi_origin && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              FDI: {project.fdi_origin}
                            </Badge>
                          )}
                        </div>
                        {project.announcement_date && (
                          <span className="text-sm text-slate-500">
                            {new Date(project.announcement_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                        )}
                      </div>

                      {/* Project Details */}
                      <div className="flex flex-wrap gap-3 text-sm">
                        {project.project_type && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-600 capitalize">{project.project_type.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        {project.jobs_announced && (
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-600">{project.jobs_announced.toLocaleString()} jobs</span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {project.notes && (
                        <p className="text-sm text-slate-600">{project.notes}</p>
                      )}

                      {/* Source */}
                      {project.source_url && (
                        <a
                          href={project.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                        >
                          Source
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* LinkedIn Description - below signals, less prominent */}
          {company.linkedin_description && (
            <Card className="mt-6 border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                  About (LinkedIn)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 leading-relaxed">
                  <ExpandableText text={company.linkedin_description} maxLength={400} />
                </p>
                {company.linkedin_url && (
                  <a
                    href={company.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-[#0A66C2] hover:underline"
                  >
                    View on LinkedIn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
