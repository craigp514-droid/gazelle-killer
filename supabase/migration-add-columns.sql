-- Add missing columns to companies table for full data import

-- Country
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country text;

-- LinkedIn URL
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_url text;

-- NAICS code (for EDO filtering)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS naics_code text;

-- Ownership (Private, Public, Subsidiary)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ownership text;

-- Stock ticker (for public companies)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ticker text;

-- Index for common filters
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(country);
CREATE INDEX IF NOT EXISTS idx_companies_ownership ON companies(ownership);
