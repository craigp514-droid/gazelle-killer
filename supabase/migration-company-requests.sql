-- Migration: Company Requests table
-- Stores user requests for companies not yet tracked

CREATE TABLE IF NOT EXISTS company_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_name  text NOT NULL,
  requested_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  status          text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'added')),
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_company_requests_status ON company_requests(status);
CREATE INDEX IF NOT EXISTS idx_company_requests_org ON company_requests(organization_id);

-- RLS
ALTER TABLE company_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert requests
CREATE POLICY "Users can request companies" ON company_requests
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

-- Users can see their own org's requests
CREATE POLICY "Users see org requests" ON company_requests
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_company_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_requests_updated_at ON company_requests;
CREATE TRIGGER company_requests_updated_at
  BEFORE UPDATE ON company_requests
  FOR EACH ROW EXECUTE FUNCTION update_company_requests_updated_at();
