-- Migration: Add Industry Hierarchy (2-level navigation)
-- Industries → Segments → Companies (with sub_segment as data field)

-- ============================================
-- 1. CREATE INDUSTRIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS industries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  slug            text NOT NULL UNIQUE,
  description     text,
  icon            text,
  color           text,
  display_order   integer DEFAULT 0,
  is_coming_soon  boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- ============================================
-- 2. ADD INDUSTRY_ID TO SEGMENTS (before RLS)
-- ============================================

ALTER TABLE segments ADD COLUMN IF NOT EXISTS industry_id uuid REFERENCES industries(id);

-- ============================================
-- 3. ADD SUB_SEGMENT TO COMPANIES
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS sub_segment text;

-- Index for sub_segment filtering
CREATE INDEX IF NOT EXISTS idx_companies_sub_segment ON companies(sub_segment);

-- ============================================
-- 4. SEED INDUSTRIES
-- ============================================

INSERT INTO industries (name, slug, description, icon, color, display_order, is_coming_soon) VALUES
  ('Semiconductors', 'semiconductors', 'Chip fabrication, equipment, materials, and packaging', 'cpu', '#3B82F6', 1, false),
  ('Robotics', 'robotics', 'Industrial, warehouse, humanoid, and service robotics', 'cog', '#EF4444', 2, false),
  ('Battery & Energy Storage', 'battery-energy-storage', 'EV batteries, grid storage, and long-duration storage', 'battery', '#10B981', 3, false),
  ('Space & Aerospace', 'space-aerospace', 'Launch, satellites, and space infrastructure', 'rocket', '#EC4899', 4, false),
  ('Defense & Hypersonics', 'defense-hypersonics', 'Defense tech, hypersonics, and dual-use systems', 'shield', '#64748B', 5, false),
  ('Rare Earth & Critical Minerals', 'rare-earth-minerals', 'Mining, processing, and refining of critical materials', 'gem', '#F59E0B', 6, false),
  ('Life Sciences', 'life-sciences', 'CDMOs, medical devices, and biotech manufacturing', 'heart', '#F43F5E', 7, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order,
  is_coming_soon = EXCLUDED.is_coming_soon;

-- ============================================
-- 5. ENABLE RLS ON INDUSTRIES (after column exists)
-- ============================================

ALTER TABLE industries ENABLE ROW LEVEL SECURITY;

-- Policy: users see industries their org has access to (via segments)
DROP POLICY IF EXISTS "Users see industries via segments" ON industries;
CREATE POLICY "Users see industries via segments" ON industries FOR SELECT USING (
  id IN (
    SELECT DISTINCT s.industry_id 
    FROM segments s
    INNER JOIN organization_segments os ON os.segment_id = s.id
    INNER JOIN profiles p ON p.organization_id = os.organization_id
    WHERE p.id = auth.uid()
  )
  OR is_coming_soon = true
);

-- ============================================
-- 6. UPDATE EXISTING SEGMENTS WITH INDUSTRY_ID
-- ============================================

-- Map existing segments to Battery & Energy Storage
UPDATE segments SET industry_id = (SELECT id FROM industries WHERE slug = 'battery-energy-storage')
WHERE slug IN ('battery-storage', 'clean-energy', 'hydrogen-fuel-cells');

-- Map to Space & Aerospace
UPDATE segments SET industry_id = (SELECT id FROM industries WHERE slug = 'space-aerospace')
WHERE slug IN ('space-tech', 'evtol');

-- Map to Robotics
UPDATE segments SET industry_id = (SELECT id FROM industries WHERE slug = 'robotics')
WHERE slug IN ('robotics-automation', 'autonomous-vehicles');

-- Map to Defense
UPDATE segments SET industry_id = (SELECT id FROM industries WHERE slug = 'defense-hypersonics')
WHERE slug = 'defense-tech';

-- Map to Semiconductors
UPDATE segments SET industry_id = (SELECT id FROM industries WHERE slug = 'semiconductors')
WHERE slug IN ('semiconductors', 'advanced-materials', 'ai-ml');

-- Map to Life Sciences
UPDATE segments SET industry_id = (SELECT id FROM industries WHERE slug = 'life-sciences')
WHERE slug = 'biotech-life-sciences';

-- ============================================
-- 7. ADD MORE DETAILED SEGMENTS PER INDUSTRY
-- ============================================

-- Semiconductors segments
INSERT INTO segments (name, slug, description, icon, color, display_order, industry_id) VALUES
  ('Fabs / Foundries', 'fabs-foundries', 'Chip fabrication facilities', 'factory', '#3B82F6', 1, (SELECT id FROM industries WHERE slug = 'semiconductors')),
  ('Equipment (Front-End)', 'equipment-frontend', 'Lithography, deposition, etch, metrology', 'settings', '#3B82F6', 2, (SELECT id FROM industries WHERE slug = 'semiconductors')),
  ('Equipment (Back-End)', 'equipment-backend', 'Packaging, bonding, test equipment', 'package', '#3B82F6', 3, (SELECT id FROM industries WHERE slug = 'semiconductors')),
  ('Materials & Chemicals', 'materials-chemicals', 'Wafers, photoresists, gases, slurries', 'flask', '#3B82F6', 4, (SELECT id FROM industries WHERE slug = 'semiconductors')),
  ('Substrates', 'substrates', 'ABF substrates, lead frames, ceramic', 'layers', '#3B82F6', 5, (SELECT id FROM industries WHERE slug = 'semiconductors')),
  ('OSAT', 'osat', 'Outsourced assembly and test', 'box', '#3B82F6', 6, (SELECT id FROM industries WHERE slug = 'semiconductors'))
ON CONFLICT (slug) DO UPDATE SET
  industry_id = EXCLUDED.industry_id,
  description = EXCLUDED.description;

-- Robotics segments
INSERT INTO segments (name, slug, description, icon, color, display_order, industry_id) VALUES
  ('Industrial Robotics', 'industrial-robotics', '6-axis robots, cobots, SCARA, delta', 'cog', '#EF4444', 1, (SELECT id FROM industries WHERE slug = 'robotics')),
  ('Warehouse Robotics', 'warehouse-robotics', 'AMRs, AGVs, goods-to-person systems', 'warehouse', '#EF4444', 2, (SELECT id FROM industries WHERE slug = 'robotics')),
  ('Humanoid Robots', 'humanoid-robots', 'Bipedal, service, and teleoperated humanoids', 'user', '#EF4444', 3, (SELECT id FROM industries WHERE slug = 'robotics')),
  ('Medical Robotics', 'medical-robotics', 'Surgical robots, rehabilitation, prosthetics', 'heart', '#EF4444', 4, (SELECT id FROM industries WHERE slug = 'robotics')),
  ('Agricultural Robotics', 'agricultural-robotics', 'Autonomous tractors, harvesting, livestock', 'leaf', '#EF4444', 5, (SELECT id FROM industries WHERE slug = 'robotics')),
  ('Service Robotics', 'service-robotics', 'Cleaning, hospitality, delivery robots', 'bot', '#EF4444', 6, (SELECT id FROM industries WHERE slug = 'robotics'))
ON CONFLICT (slug) DO UPDATE SET
  industry_id = EXCLUDED.industry_id,
  description = EXCLUDED.description;

-- Battery segments
INSERT INTO segments (name, slug, description, icon, color, display_order, industry_id) VALUES
  ('EV Battery', 'ev-battery', 'Cells, packs, and solid-state batteries', 'battery', '#10B981', 1, (SELECT id FROM industries WHERE slug = 'battery-energy-storage')),
  ('Grid Storage', 'grid-storage', 'Utility, C&I, and residential storage systems', 'zap', '#10B981', 2, (SELECT id FROM industries WHERE slug = 'battery-energy-storage')),
  ('Long-Duration Storage', 'long-duration-storage', 'Iron-air, flow batteries, gravity storage', 'clock', '#10B981', 3, (SELECT id FROM industries WHERE slug = 'battery-energy-storage')),
  ('Battery Components', 'battery-components', 'Cathodes, anodes, separators, electrolytes', 'puzzle', '#10B981', 4, (SELECT id FROM industries WHERE slug = 'battery-energy-storage'))
ON CONFLICT (slug) DO UPDATE SET
  industry_id = EXCLUDED.industry_id,
  description = EXCLUDED.description;

-- Space segments  
INSERT INTO segments (name, slug, description, icon, color, display_order, industry_id) VALUES
  ('Launch Services', 'launch-services', 'Launch vehicles, propulsion, ground systems', 'rocket', '#EC4899', 1, (SELECT id FROM industries WHERE slug = 'space-aerospace')),
  ('Satellites', 'satellites', 'Communications, Earth observation, navigation', 'satellite', '#EC4899', 2, (SELECT id FROM industries WHERE slug = 'space-aerospace')),
  ('Space Infrastructure', 'space-infrastructure', 'Stations, in-space manufacturing, orbital services', 'globe', '#EC4899', 3, (SELECT id FROM industries WHERE slug = 'space-aerospace')),
  ('Ground Segment', 'ground-segment', 'Antennas, mission control, user terminals', 'radio', '#EC4899', 4, (SELECT id FROM industries WHERE slug = 'space-aerospace'))
ON CONFLICT (slug) DO UPDATE SET
  industry_id = EXCLUDED.industry_id,
  description = EXCLUDED.description;

-- ============================================
-- 8. UPDATE ORG SEGMENTS FOR NEW SEGMENTS
-- ============================================

-- Give demo org access to all new segments
INSERT INTO organization_segments (organization_id, segment_id)
SELECT o.id, s.id
FROM organizations o, segments s
WHERE o.slug = 'demo-eda'
  AND s.id NOT IN (SELECT segment_id FROM organization_segments WHERE organization_id = o.id)
ON CONFLICT DO NOTHING;
