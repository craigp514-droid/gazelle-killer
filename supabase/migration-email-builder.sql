-- Email Builder Schema
-- Run this migration to add email builder tables

-- User email templates (saved paragraphs and full emails)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('intro', 'context', 'close', 'full')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User approved drafts for style learning (max 5 per user, rolling)
CREATE TABLE IF NOT EXISTS email_approved_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  full_email TEXT NOT NULL,
  intro_paragraph TEXT,
  context_paragraph TEXT,
  close_paragraph TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated emails history (for reference)
CREATE TABLE IF NOT EXISTS email_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  intro_paragraph TEXT,
  context_paragraph TEXT,
  close_paragraph TEXT,
  full_email TEXT,
  word_count INT,
  reading_level NUMERIC(3,1),
  human_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_approved_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_generations ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own templates
CREATE POLICY "Users can manage own templates" ON email_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own drafts" ON email_approved_drafts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own generations" ON email_generations
  FOR ALL USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_templates(user_id, category);
CREATE INDEX IF NOT EXISTS idx_email_drafts_user ON email_approved_drafts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_generations_company ON email_generations(company_id, created_at DESC);
