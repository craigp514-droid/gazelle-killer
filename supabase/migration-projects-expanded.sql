-- Add columns for Feeny's master project tracker
-- Run this in Supabase SQL Editor

ALTER TABLE projects ADD COLUMN IF NOT EXISTS capex_millions DECIMAL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sector TEXT;
