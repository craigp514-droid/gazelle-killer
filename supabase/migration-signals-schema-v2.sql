-- Migration: Enhanced Signals Schema v2
-- Based on Todd's multi-signal schema design

-- ============================================
-- 1. ADD NEW FIELDS TO SIGNALS TABLE
-- ============================================

-- Signal tier (1-6 per taxonomy)
ALTER TABLE signals ADD COLUMN IF NOT EXISTS signal_tier integer;

-- Discovery and lifecycle dates
ALTER TABLE signals ADD COLUMN IF NOT EXISTS discovered_date date DEFAULT CURRENT_DATE;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS expiry_date date;

-- Signal status (active/stale/superseded/archived)
ALTER TABLE signals ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Detailed description (rename if needed, or add)
ALTER TABLE signals ADD COLUMN IF NOT EXISTS details text;

-- Primary source type
ALTER TABLE signals ADD COLUMN IF NOT EXISTS source_type text;

-- Secondary source (for multi-source signals)
ALTER TABLE signals ADD COLUMN IF NOT EXISTS source_2_url text;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS source_2_type text;

-- ============================================
-- 2. ADD COMPUTED FIELDS TO COMPANIES
-- ============================================

-- Count of active signals
ALTER TABLE companies ADD COLUMN IF NOT EXISTS signal_count integer DEFAULT 0;

-- Flag for site search signals (GOLD leads)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS has_site_search boolean DEFAULT false;

-- Best signal type (type of highest scoring active signal)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS best_signal_type text;

-- Last signal date
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_signal_date date;

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_signal_type ON signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_signal_tier ON signals(signal_tier);
CREATE INDEX IF NOT EXISTS idx_signals_signal_date ON signals(signal_date);
CREATE INDEX IF NOT EXISTS idx_companies_has_site_search ON companies(has_site_search);

-- ============================================
-- 4. CREATE FUNCTION TO UPDATE COMPANY COMPUTED FIELDS
-- ============================================

CREATE OR REPLACE FUNCTION update_company_signal_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_signal_count integer;
  v_has_site_search boolean;
  v_best_signal_type text;
  v_best_score integer;
  v_last_signal_date date;
  v_current_score numeric;
BEGIN
  -- Get the company_id from either NEW or OLD record
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);
  
  -- Calculate signal count (active signals only)
  SELECT COUNT(*) INTO v_signal_count
  FROM signals
  WHERE company_id = v_company_id
    AND (status = 'active' OR status IS NULL);
  
  -- Check for site_search signals
  SELECT EXISTS(
    SELECT 1 FROM signals
    WHERE company_id = v_company_id
      AND signal_type = 'site_search'
      AND (status = 'active' OR status IS NULL)
  ) INTO v_has_site_search;
  
  -- Get best signal type and score
  SELECT signal_type, COALESCE(strength, 5)
  INTO v_best_signal_type, v_best_score
  FROM signals
  WHERE company_id = v_company_id
    AND (status = 'active' OR status IS NULL)
  ORDER BY COALESCE(strength, 5) DESC, signal_date DESC
  LIMIT 1;
  
  -- Get last signal date
  SELECT MAX(signal_date) INTO v_last_signal_date
  FROM signals
  WHERE company_id = v_company_id
    AND (status = 'active' OR status IS NULL);
  
  -- Calculate current score (max of active signal scores, or existing composite_score)
  SELECT GREATEST(
    COALESCE((SELECT MAX(COALESCE(strength, 5)) FROM signals WHERE company_id = v_company_id AND (status = 'active' OR status IS NULL)), 0),
    COALESCE((SELECT composite_score FROM companies WHERE id = v_company_id), 0)
  ) INTO v_current_score;
  
  -- Update company
  UPDATE companies
  SET 
    signal_count = v_signal_count,
    has_site_search = v_has_site_search,
    best_signal_type = v_best_signal_type,
    last_signal_date = v_last_signal_date,
    composite_score = v_current_score
  WHERE id = v_company_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. CREATE TRIGGERS
-- ============================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_company_signal_stats ON signals;

-- Create trigger for INSERT, UPDATE, DELETE on signals
CREATE TRIGGER trigger_update_company_signal_stats
AFTER INSERT OR UPDATE OR DELETE ON signals
FOR EACH ROW
EXECUTE FUNCTION update_company_signal_stats();

-- ============================================
-- 6. BACKFILL EXISTING DATA
-- ============================================

-- Update all companies with their current signal stats
UPDATE companies c
SET 
  signal_count = (
    SELECT COUNT(*) FROM signals s 
    WHERE s.company_id = c.id 
    AND (s.status = 'active' OR s.status IS NULL)
  ),
  has_site_search = EXISTS(
    SELECT 1 FROM signals s 
    WHERE s.company_id = c.id 
    AND s.signal_type = 'site_search'
    AND (s.status = 'active' OR s.status IS NULL)
  ),
  last_signal_date = (
    SELECT MAX(s.signal_date) FROM signals s 
    WHERE s.company_id = c.id
    AND (s.status = 'active' OR s.status IS NULL)
  );
