-- Add enrichment fields to companies table
-- Run this in Supabase SQL Editor

ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_followers INTEGER;
