-- Add LinkedIn description field for company profiles
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_description text;
