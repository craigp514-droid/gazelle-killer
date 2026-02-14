-- Projects table for tracking announced/completed facility projects
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Project details
  location_city TEXT,
  location_state TEXT,
  jobs_announced INTEGER,
  project_type TEXT,           -- manufacturing, R&D, HQ, distribution, expansion
  announcement_date DATE,
  fdi_origin TEXT,             -- Foreign Direct Investment origin country (NULL if domestic)
  source_url TEXT,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for company lookups
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_projects_announcement_date ON projects(announcement_date DESC);

-- RLS policy (same as other tables - public read for MVP)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Authenticated insert projects" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update projects" ON projects FOR UPDATE USING (auth.uid() IS NOT NULL);
