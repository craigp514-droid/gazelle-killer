-- Migration: Add Clay enrichment tracking
-- Run this in Supabase SQL Editor

-- Add last_enriched_at column to companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz;

-- Add index for efficient querying of unenriched companies
CREATE INDEX IF NOT EXISTS idx_companies_last_enriched_at 
ON companies(last_enriched_at);

-- Comment for clarity
COMMENT ON COLUMN companies.last_enriched_at IS 'Timestamp of last Clay enrichment push. NULL = never enriched.';
