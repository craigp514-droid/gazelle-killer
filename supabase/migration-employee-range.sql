-- Add employee_range field for LinkedIn size categories
-- (e.g., "11-50 employees", "10,001+ employees")
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_range text;
