export type Industry = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  display_order: number
  is_coming_soon: boolean
  created_at: string
}

export type Segment = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  display_order: number
  industry_id: string | null
  created_at: string
}

export type Company = {
  id: string
  slug: string
  name: string
  description: string | null
  website: string | null
  logo_url: string | null
  hq_city: string | null
  hq_state: string | null
  hq_country: string | null
  latitude: number | null
  longitude: number | null
  employee_count: number | null
  employee_count_updated_at: string | null
  founded_year: number | null
  ownership_type: 'public' | 'private' | 'subsidiary' | 'government' | null
  ticker_symbol: string | null
  parent_company: string | null
  naics_codes: string[] | null
  composite_score: number
  tier: 'A' | 'B' | 'C'
  score_updated_at: string | null
  messaging_hook: string | null
  notes: string | null
  data_quality: number
  created_at: string
  updated_at: string
}

export type Signal = {
  id: string
  company_id: string
  signal_type: SignalType
  title: string
  summary: string | null
  description: string | null
  signal_date: string
  source_url: string | null
  source_name: string | null
  signal_strength: number | null
  is_negative: boolean
  verified: boolean
  created_at: string
}

export type SignalType = 
  | 'funding_round'
  | 'hiring_surge'
  | 'new_facility'
  | 'contract_award'
  | 'patent_filing'
  | 'leadership_change'
  | 'expansion_announcement'
  | 'partnership'
  | 'acquisition'
  | 'product_launch'
  | 'regulatory_approval'
  | 'ipo_filing'
  | 'layoff'
  | 'facility_closure'
  | 'relocation'

export type Organization = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  subscription_tier: 'basic' | 'pro' | 'enterprise'
  max_users: number
  created_at: string
}

export type Profile = {
  id: string
  organization_id: string | null
  full_name: string | null
  email: string
  role: 'admin' | 'viewer'
  avatar_url: string | null
  platform_admin: boolean
  last_login_at: string | null
  created_at: string
}

export type UserBookmark = {
  id: string
  user_id: string
  company_id: string
  notes: string | null
  created_at: string
}

export type CompanyWithSegments = Company & {
  segments: Segment[]
  latest_signal?: Signal
}
