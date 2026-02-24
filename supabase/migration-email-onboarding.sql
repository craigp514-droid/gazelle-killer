-- Email Onboarding Schema
-- Adds org context and email templates for personalized outreach

-- Add org context fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_type TEXT CHECK (org_type IN ('edo', 'service_provider'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_region TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_industries TEXT[]; -- array of target industries
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_value_props TEXT; -- key benefits/incentives
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_onboarding_complete BOOLEAN DEFAULT FALSE;

-- User's saved intro and close templates
CREATE TABLE IF NOT EXISTS email_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snippet_type TEXT NOT NULL CHECK (snippet_type IN ('intro', 'close')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE email_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own snippets" ON email_snippets
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_email_snippets_user ON email_snippets(user_id, snippet_type);

-- Ensure only one default per type per user (handled in app logic, but add constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_snippets_default 
  ON email_snippets(user_id, snippet_type) 
  WHERE is_default = TRUE;
