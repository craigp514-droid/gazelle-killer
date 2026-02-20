import { createClient } from '@/lib/supabase/server'
import { CompanyList } from '@/components/companies/company-list'

interface PageProps {
  searchParams: Promise<{ 
    industry?: string
    segment?: string
    page?: string
    view?: string
    filter?: string  // 'expanded' for recently expanded companies
  }>
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Get all industries for filter dropdown
  const { data: industries } = await supabase
    .from('industries')
    .select('*')
    .eq('is_coming_soon', false)
    .order('display_order')

  // Get all segments
  const { data: allSegments } = await supabase
    .from('segments')
    .select('*')
    .order('display_order')

  // Filter segments by selected industry
  const selectedIndustry = industries?.find(i => i.slug === params.industry)
  const filteredSegments = selectedIndustry 
    ? allSegments?.filter(s => s.industry_id === selectedIndustry.id)
    : []

  const selectedSegment = allSegments?.find(s => s.slug === params.segment)

  // Get companies with projects (for "Recently Expanded" filter)
  let expandedCompanyIds: string[] = []
  if (params.filter === 'expanded') {
    const { data: projectCompanies } = await supabase
      .from('projects')
      .select('company_id')
    expandedCompanyIds = [...new Set(projectCompanies?.map(p => p.company_id) || [])]
  }

  // Build company query based on filters
  let companyIds: string[] = []

  if (selectedSegment) {
    // Filter by specific segment
    const { data: cs } = await supabase
      .from('company_segments')
      .select('company_id')
      .eq('segment_id', selectedSegment.id)
    companyIds = cs?.map(c => c.company_id) || []
  } else if (selectedIndustry) {
    // Filter by industry (all segments in that industry)
    const industrySegmentIds = allSegments
      ?.filter(s => s.industry_id === selectedIndustry.id)
      .map(s => s.id) || []
    
    if (industrySegmentIds.length > 0) {
      const { data: cs } = await supabase
        .from('company_segments')
        .select('company_id')
        .in('segment_id', industrySegmentIds)
      companyIds = [...new Set(cs?.map(c => c.company_id) || [])]
    }
  } else {
    // No filter - query companies directly (skip the company_segments lookup)
    companyIds = [] // Empty signals "get all" mode below
  }

  // Pagination
  const page = parseInt(params.page || '1')
  const perPage = 50
  const start = (page - 1) * perPage
  const end = start + perPage - 1

  // Apply "Recently Expanded" filter if active
  if (params.filter === 'expanded' && expandedCompanyIds.length > 0) {
    if (companyIds.length > 0) {
      // Intersect with industry/segment filter
      companyIds = companyIds.filter(id => expandedCompanyIds.includes(id))
    } else {
      // Just use expanded filter
      companyIds = expandedCompanyIds
    }
  }

  // Get companies with pagination
  let companies: any[] = []
  let totalCount = 0

  if (companyIds.length > 0 || params.filter === 'expanded') {
    // Filtered by segment, industry, or expanded
    const idsToQuery = companyIds.length > 0 ? companyIds : expandedCompanyIds
    const { data, count } = await supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .in('id', idsToQuery)
      .order('composite_score', { ascending: false })
      .range(start, end)
    
    companies = data || []
    totalCount = count || 0
  } else if (!selectedIndustry && !selectedSegment) {
    // No filter - get all companies directly
    const { data, count } = await supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .order('composite_score', { ascending: false })
      .range(start, end)
    
    companies = data || []
    totalCount = count || 0
  }

  // Get company segments mapping for display
  const { data: companySegmentData } = await supabase
    .from('company_segments')
    .select('company_id, segment_id, is_primary')
    .in('company_id', companies.map(c => c.id))

  // Get latest signals for each company
  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .in('company_id', companies.map(c => c.id))
    .order('created_at', { ascending: false })

  const signalsByCompany = signals?.reduce((acc: Record<string, any>, signal) => {
    if (!acc[signal.company_id]) acc[signal.company_id] = signal
    return acc
  }, {}) || {}

  // Get user's favorites
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userFavorites } = await supabase
    .from('user_bookmarks')
    .select('company_id')
    .eq('user_id', user?.id)
  
  const favoritedCompanyIds = new Set(userFavorites?.map(f => f.company_id) || [])

  // Build segment lookup
  const segmentById = allSegments?.reduce((acc: Record<string, any>, s) => {
    acc[s.id] = s
    return acc
  }, {}) || {}

  // Build industry lookup
  const industryById = industries?.reduce((acc: Record<string, any>, i) => {
    acc[i.id] = i
    return acc
  }, {}) || {}

  // Map company to primary segment
  const companyPrimarySegment = companySegmentData?.reduce((acc: Record<string, any>, cs) => {
    if (cs.is_primary || !acc[cs.company_id]) {
      const segment = segmentById[cs.segment_id]
      if (segment) {
        acc[cs.company_id] = {
          segment,
          industry: segment.industry_id ? industryById[segment.industry_id] : null
        }
      }
    }
    return acc
  }, {}) || {}

  const totalPages = Math.ceil(totalCount / perPage)

  return (
    <CompanyList
      companies={companies}
      industries={industries || []}
      segments={filteredSegments || []}
      selectedIndustry={params.industry}
      selectedSegment={params.segment}
      selectedFilter={params.filter}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      view={params.view || 'detailed'}
      signalsByCompany={signalsByCompany}
      favoritedCompanyIds={favoritedCompanyIds}
      companyPrimarySegment={companyPrimarySegment}
    />
  )
}
