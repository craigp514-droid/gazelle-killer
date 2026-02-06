-- Gazelle Killer MVP Schema
-- Step 1: Tables, Indexes, Triggers, RLS Policies, Seed Data

-- ============================================
-- TABLES
-- ============================================

-- Segments (industry groupings like "Battery Storage", "eVTOL")
CREATE TABLE IF NOT EXISTS segments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  slug            text NOT NULL UNIQUE,
  description     text,
  icon            text,
  color           text,
  display_order   integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  website         text,
  logo_url        text,
  hq_city         text,
  hq_state        text,
  hq_country      text DEFAULT 'US',
  latitude        numeric,
  longitude       numeric,
  employee_count  integer,
  employee_count_updated_at timestamptz,
  founded_year    integer,
  ownership_type  text CHECK (ownership_type IN ('public','private','subsidiary','government')),
  ticker_symbol   text,
  parent_company  text,
  naics_codes     text[],
  composite_score numeric DEFAULT 0 CHECK (composite_score >= 0 AND composite_score <= 10),
  tier            text GENERATED ALWAYS AS (
                    CASE
                      WHEN composite_score >= 6 THEN 'A'
                      WHEN composite_score >= 3 THEN 'B'
                      ELSE 'C'
                    END
                  ) STORED,
  score_updated_at timestamptz,
  messaging_hook  text,
  notes           text,
  data_quality    integer DEFAULT 0 CHECK (data_quality >= 0 AND data_quality <= 100),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Company-Segment junction table
CREATE TABLE IF NOT EXISTS company_segments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,
  segment_id      uuid REFERENCES segments(id) ON DELETE CASCADE,
  is_primary      boolean DEFAULT false,
  UNIQUE(company_id, segment_id)
);

-- Signals (funding rounds, hiring surges, etc.)
CREATE TABLE IF NOT EXISTS signals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,
  signal_type     text NOT NULL CHECK (signal_type IN (
                    'funding_round','hiring_surge','new_facility','contract_award',
                    'patent_filing','leadership_change','expansion_announcement',
                    'partnership','acquisition','product_launch','regulatory_approval',
                    'ipo_filing','layoff','facility_closure','relocation'
                  )),
  title           text NOT NULL,
  summary         text,
  description     text,
  signal_date     date NOT NULL,
  source_url      text,
  source_name     text,
  signal_strength integer CHECK (signal_strength >= 1 AND signal_strength <= 10),
  is_negative     boolean DEFAULT false,
  verified        boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Score components (breakdown of composite score)
CREATE TABLE IF NOT EXISTS score_components (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,
  component_name  text NOT NULL,
  component_score numeric,
  weight          numeric DEFAULT 1.0,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(company_id, component_name)
);

-- Organizations (EDO clients - tenancy boundary)
CREATE TABLE IF NOT EXISTS organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  logo_url        text,
  subscription_tier text DEFAULT 'basic' CHECK (subscription_tier IN ('basic','pro','enterprise')),
  max_users       integer DEFAULT 5,
  created_at      timestamptz DEFAULT now()
);

-- Organization-Segment access (which segments each org can see)
CREATE TABLE IF NOT EXISTS organization_segments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  segment_id      uuid REFERENCES segments(id) ON DELETE CASCADE,
  UNIQUE(organization_id, segment_id)
);

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id),
  full_name       text,
  email           text NOT NULL,
  role            text DEFAULT 'viewer' CHECK (role IN ('admin','viewer')),
  avatar_url      text,
  platform_admin  boolean DEFAULT false,
  last_login_at   timestamptz,
  email_preferences jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

-- User bookmarks (favorites)
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE,
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Share tokens (for shareable signal digests)
CREATE TABLE IF NOT EXISTS share_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token           text UNIQUE NOT NULL,
  created_by      uuid REFERENCES profiles(id),
  content         jsonb,
  expires_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_composite_score ON companies(composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(hq_state, hq_city);
CREATE INDEX IF NOT EXISTS idx_companies_geo ON companies(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_tier ON companies(tier);
CREATE INDEX IF NOT EXISTS idx_signals_company_date ON signals(company_id, signal_date DESC);
CREATE INDEX IF NOT EXISTS idx_signals_date ON signals(signal_date DESC);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_company_segments_company ON company_segments(company_id);
CREATE INDEX IF NOT EXISTS idx_company_segments_segment ON company_segments(segment_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_companies_search ON companies USING gin(
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(hq_city,'') || ' ' || coalesce(hq_state,'') || ' ' || coalesce(parent_company,'') || ' ' || coalesce(notes,''))
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on companies
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Segments: users see only their org's segments
DROP POLICY IF EXISTS "Users see their org segments" ON segments;
CREATE POLICY "Users see their org segments" ON segments FOR SELECT USING (
  id IN (
    SELECT os.segment_id FROM organization_segments os
    JOIN profiles p ON p.organization_id = os.organization_id
    WHERE p.id = auth.uid()
  )
);

-- Companies: visible if tagged in an accessible segment
DROP POLICY IF EXISTS "Users see companies in their segments" ON companies;
CREATE POLICY "Users see companies in their segments" ON companies FOR SELECT USING (
  id IN (
    SELECT cs.company_id FROM company_segments cs
    WHERE cs.segment_id IN (
      SELECT os.segment_id FROM organization_segments os
      JOIN profiles p ON p.organization_id = os.organization_id
      WHERE p.id = auth.uid()
    )
  )
);

-- Signals: visible if company is visible
DROP POLICY IF EXISTS "Users see signals for visible companies" ON signals;
CREATE POLICY "Users see signals for visible companies" ON signals FOR SELECT USING (
  company_id IN (
    SELECT cs.company_id FROM company_segments cs
    WHERE cs.segment_id IN (
      SELECT os.segment_id FROM organization_segments os
      JOIN profiles p ON p.organization_id = os.organization_id
      WHERE p.id = auth.uid()
    )
  )
);

-- Company-segments: visible if segment is accessible
DROP POLICY IF EXISTS "Users see company-segment links" ON company_segments;
CREATE POLICY "Users see company-segment links" ON company_segments FOR SELECT USING (
  segment_id IN (
    SELECT os.segment_id FROM organization_segments os
    JOIN profiles p ON p.organization_id = os.organization_id
    WHERE p.id = auth.uid()
  )
);

-- Score components: visible if company is visible
DROP POLICY IF EXISTS "Users see scores for visible companies" ON score_components;
CREATE POLICY "Users see scores for visible companies" ON score_components FOR SELECT USING (
  company_id IN (
    SELECT cs.company_id FROM company_segments cs
    WHERE cs.segment_id IN (
      SELECT os.segment_id FROM organization_segments os
      JOIN profiles p ON p.organization_id = os.organization_id
      WHERE p.id = auth.uid()
    )
  )
);

-- Profiles: users see their own profile and others in their org
DROP POLICY IF EXISTS "Users see own org profiles" ON profiles;
CREATE POLICY "Users see own org profiles" ON profiles FOR SELECT USING (
  organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Organizations: users see their own org
DROP POLICY IF EXISTS "Users see own org" ON organizations;
CREATE POLICY "Users see own org" ON organizations FOR SELECT USING (
  id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Bookmarks: users see/manage only their own
DROP POLICY IF EXISTS "Users manage own bookmarks" ON user_bookmarks;
CREATE POLICY "Users manage own bookmarks" ON user_bookmarks FOR ALL USING (user_id = auth.uid());

-- Organization segments: visible for own org
DROP POLICY IF EXISTS "Users see own org segments" ON organization_segments;
CREATE POLICY "Users see own org segments" ON organization_segments FOR SELECT USING (
  organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Share tokens: public read for valid tokens, owner can manage
DROP POLICY IF EXISTS "Anyone can read valid share tokens" ON share_tokens;
CREATE POLICY "Anyone can read valid share tokens" ON share_tokens FOR SELECT USING (
  expires_at > now() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users manage own share tokens" ON share_tokens;
CREATE POLICY "Users manage own share tokens" ON share_tokens FOR ALL USING (created_by = auth.uid());
