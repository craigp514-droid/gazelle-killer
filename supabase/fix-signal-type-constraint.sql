-- Drop the restrictive signal_type constraint to allow new types
ALTER TABLE signals DROP CONSTRAINT IF EXISTS signals_signal_type_check;

-- Add a more permissive constraint (or no constraint at all for flexibility)
-- We'll rely on application logic to validate signal types
