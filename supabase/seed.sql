-- Gazelle Killer MVP Seed Data
-- Sample segments, companies, signals, and test organization

-- ============================================
-- SEED: SEGMENTS
-- ============================================

INSERT INTO segments (name, slug, description, icon, color, display_order) VALUES
  ('Battery Storage', 'battery-storage', 'Grid-scale and commercial battery energy storage systems', 'battery', '#10B981', 1),
  ('eVTOL', 'evtol', 'Electric vertical takeoff and landing aircraft', 'plane', '#6366F1', 2),
  ('Advanced Materials', 'advanced-materials', 'Next-gen materials including composites, ceramics, and nanomaterials', 'cube', '#8B5CF6', 3),
  ('Space Tech', 'space-tech', 'Satellite, launch, and space infrastructure companies', 'rocket', '#EC4899', 4),
  ('Hydrogen & Fuel Cells', 'hydrogen-fuel-cells', 'Green hydrogen production and fuel cell technology', 'zap', '#14B8A6', 5),
  ('Autonomous Vehicles', 'autonomous-vehicles', 'Self-driving cars, trucks, and logistics automation', 'truck', '#F59E0B', 6),
  ('Robotics & Automation', 'robotics-automation', 'Industrial robotics, cobots, and warehouse automation', 'cog', '#EF4444', 7),
  ('Semiconductors', 'semiconductors', 'Chip design, fabrication, and packaging', 'cpu', '#3B82F6', 8),
  ('Clean Energy', 'clean-energy', 'Solar, wind, and renewable energy generation', 'sun', '#22C55E', 9),
  ('Defense Tech', 'defense-tech', 'Defense and dual-use technology companies', 'shield', '#64748B', 10),
  ('Biotech & Life Sciences', 'biotech-life-sciences', 'Biotechnology, pharmaceuticals, and medical devices', 'heart', '#F43F5E', 11),
  ('AI & Machine Learning', 'ai-ml', 'Artificial intelligence and machine learning platforms', 'brain', '#A855F7', 12)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED: SAMPLE COMPANIES
-- ============================================

INSERT INTO companies (slug, name, description, website, hq_city, hq_state, hq_country, latitude, longitude, employee_count, employee_count_updated_at, founded_year, ownership_type, ticker_symbol, parent_company, naics_codes, composite_score, score_updated_at, messaging_hook, notes) VALUES
  (
    'form-energy',
    'Form Energy',
    'Developing iron-air batteries for multi-day grid storage at a fraction of lithium-ion costs.',
    'https://formenergy.com',
    'Somerville', 'MA', 'US',
    42.3876, -71.0995,
    750, now() - interval '30 days',
    2017,
    'private',
    NULL, NULL,
    ARRAY['335911', '541715'],
    8.5,
    now() - interval '7 days',
    'Recent $450M Series E signals manufacturing scale-up — position your region''s industrial workforce and utility partnerships.',
    'Iron-air battery tech. Ex-MIT founders. $800M+ total raised. West Virginia factory announced. TYPE 1 LEAD.'
  ),
  (
    'joby-aviation',
    'Joby Aviation',
    'Building electric air taxis for urban mobility with a piloted eVTOL aircraft.',
    'https://jobyaviation.com',
    'Santa Cruz', 'CA', 'US',
    36.9741, -122.0308,
    1500, now() - interval '14 days',
    2009,
    'public',
    'JOBY', NULL,
    ARRAY['336411', '541715'],
    7.2,
    now() - interval '3 days',
    'FAA certification progress signals production ramp — showcase your aerospace manufacturing capabilities and pilot training infrastructure.',
    'Public via SPAC. Toyota backing. Marina, CA production facility. FAA Part 135 certified.'
  ),
  (
    'redwood-materials',
    'Redwood Materials',
    'Recycling lithium-ion batteries to recover critical materials for new battery production.',
    'https://redwoodmaterials.com',
    'Carson City', 'NV', 'US',
    39.1638, -119.7674,
    850, now() - interval '21 days',
    2017,
    'private',
    NULL, NULL,
    ARRAY['562920', '331410'],
    7.8,
    now() - interval '5 days',
    'DOE loan and South Carolina expansion signal aggressive growth — highlight your recycling infrastructure and EV supply chain.',
    'JB Straubel (ex-Tesla CTO) founder. $2B+ raised. Nevada + South Carolina facilities. DOE $2B loan commitment.'
  ),
  (
    'anduril-industries',
    'Anduril Industries',
    'Building autonomous defense systems including drones, sensors, and software platforms.',
    'https://anduril.com',
    'Costa Mesa', 'CA', 'US',
    33.6846, -117.9087,
    2500, now() - interval '10 days',
    2017,
    'private',
    NULL, NULL,
    ARRAY['334511', '541715'],
    9.1,
    now() - interval '2 days',
    '$1.5B Series F and major DoD contracts signal rapid expansion — position defense manufacturing and cleared workforce.',
    'Palmer Luckey founder. Lattice AI platform. $8B+ valuation. Expanding manufacturing footprint. TYPE 1 LEAD.'
  ),
  (
    'commonwealth-fusion',
    'Commonwealth Fusion Systems',
    'Developing compact fusion reactors using high-temperature superconducting magnets.',
    'https://cfs.energy',
    'Devens', 'MA', 'US',
    42.5412, -71.6145,
    500, now() - interval '45 days',
    2018,
    'private',
    NULL, NULL,
    ARRAY['541715', '335999'],
    6.4,
    now() - interval '14 days',
    'SPARC milestone achievement signals technology validation — showcase R&D infrastructure and energy sector partnerships.',
    'MIT spinout. $2B+ raised. Building SPARC demonstration reactor. Tiger Global, Bill Gates backing.'
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED: COMPANY-SEGMENT LINKS
-- ============================================

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, true
FROM companies c, segments s
WHERE c.slug = 'form-energy' AND s.slug = 'battery-storage'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, false
FROM companies c, segments s
WHERE c.slug = 'form-energy' AND s.slug = 'clean-energy'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, true
FROM companies c, segments s
WHERE c.slug = 'joby-aviation' AND s.slug = 'evtol'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, false
FROM companies c, segments s
WHERE c.slug = 'joby-aviation' AND s.slug = 'autonomous-vehicles'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, true
FROM companies c, segments s
WHERE c.slug = 'redwood-materials' AND s.slug = 'battery-storage'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, false
FROM companies c, segments s
WHERE c.slug = 'redwood-materials' AND s.slug = 'advanced-materials'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, true
FROM companies c, segments s
WHERE c.slug = 'anduril-industries' AND s.slug = 'defense-tech'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, false
FROM companies c, segments s
WHERE c.slug = 'anduril-industries' AND s.slug = 'robotics-automation'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, false
FROM companies c, segments s
WHERE c.slug = 'anduril-industries' AND s.slug = 'ai-ml'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, true
FROM companies c, segments s
WHERE c.slug = 'commonwealth-fusion' AND s.slug = 'clean-energy'
ON CONFLICT DO NOTHING;

INSERT INTO company_segments (company_id, segment_id, is_primary)
SELECT c.id, s.id, false
FROM companies c, segments s
WHERE c.slug = 'commonwealth-fusion' AND s.slug = 'advanced-materials'
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED: SAMPLE SIGNALS
-- ============================================

INSERT INTO signals (company_id, signal_type, title, summary, signal_date, source_url, source_name, signal_strength, is_negative, verified) 
SELECT 
  c.id,
  'funding_round',
  'Form Energy Raises $450M Series E',
  'Form Energy closed a $450M Series E to scale manufacturing of iron-air batteries for grid storage.',
  '2024-10-15',
  'https://formenergy.com/press',
  'Company Press Release',
  9,
  false,
  true
FROM companies c WHERE c.slug = 'form-energy';

INSERT INTO signals (company_id, signal_type, title, summary, signal_date, source_url, source_name, signal_strength, is_negative, verified) 
SELECT 
  c.id,
  'new_facility',
  'Form Energy Announces West Virginia Manufacturing Plant',
  'Form Energy selected West Virginia for a new battery manufacturing facility, creating 750 jobs.',
  '2024-09-22',
  'https://formenergy.com/press',
  'Company Press Release',
  8,
  false,
  true
FROM companies c WHERE c.slug = 'form-energy';

INSERT INTO signals (company_id, signal_type, title, summary, signal_date, source_url, source_name, signal_strength, is_negative, verified) 
SELECT 
  c.id,
  'regulatory_approval',
  'Joby Receives FAA Part 135 Air Carrier Certification',
  'Joby Aviation received FAA Part 135 certification, a key milestone toward commercial air taxi operations.',
  '2024-11-08',
  'https://jobyaviation.com/news',
  'FAA / Company Announcement',
  8,
  false,
  true
FROM companies c WHERE c.slug = 'joby-aviation';

INSERT INTO signals (company_id, signal_type, title, summary, signal_date, source_url, source_name, signal_strength, is_negative, verified) 
SELECT 
  c.id,
  'partnership',
  'Joby and Delta Air Lines Expand Partnership',
  'Delta Air Lines deepened its partnership with Joby, investing additional capital for NYC and LA routes.',
  '2024-08-14',
  'https://news.delta.com',
  'Delta Press Release',
  7,
  false,
  true
FROM companies c WHERE c.slug = 'joby-aviation';

INSERT INTO signals (company_id, signal_type, title, summary, signal_date, source_url, source_name, signal_strength, is_negative, verified) 
SELECT 
  c.id,
  'new_facility',
  'Redwood Materials Breaks Ground on South Carolina Campus',
  'Redwood Materials began construction on a $3.5B battery materials campus in South Carolina.',
  '2024-07-30',
  'https://redwoodmaterials.com/news',
  'Company Press Release',
  9,
  false,
  true
FROM companies c WHERE c.slug = 'redwood-materials';

INSERT INTO signals (company_id, signal_type, title, summary, signal_date, source_url, source_name, signal_strength, is_negative, verified) 
SELECT 
  c.id,
  'contract_award',
  'Anduril Wins $1B+ Counter-UAS Contract',
  'Anduril secured a contract worth over $1B to provide counter-drone systems to the US military.',
  '2024-12-01',
  'https://anduril.com/newsroom',
  'DoD Announcement',
  10,
  false,
  true
FROM companies c WHERE c.slug = 'anduril-industries';

INSERT INTO signals (company_id, signal_type, title, summary, signal_date, source_url, source_name, signal_strength, is_negative, verified) 
SELECT 
  c.id,
  'funding_round',
  'Anduril Raises $1.5B at $8B+ Valuation',
  'Anduril Industries closed a $1.5B Series F, valuing the defense tech company at over $8 billion.',
  '2024-08-22',
  'https://techcrunch.com',
  'TechCrunch',
  9,
  false,
  true
FROM companies c WHERE c.slug = 'anduril-industries';

INSERT INTO signals (company_id, signal_type, title, summary, signal_date, source_url, source_name, signal_strength, is_negative, verified) 
SELECT 
  c.id,
  'product_launch',
  'Commonwealth Fusion Achieves SPARC Magnet Milestone',
  'CFS successfully tested high-temperature superconducting magnets, validating their fusion reactor design.',
  '2024-06-18',
  'https://cfs.energy/news',
  'Company Press Release',
  7,
  false,
  true
FROM companies c WHERE c.slug = 'commonwealth-fusion';

-- ============================================
-- SEED: TEST ORGANIZATION
-- ============================================

INSERT INTO organizations (name, slug, subscription_tier, max_users)
VALUES ('Demo Economic Development Agency', 'demo-eda', 'pro', 10)
ON CONFLICT (slug) DO NOTHING;

-- Give test org access to all segments
INSERT INTO organization_segments (organization_id, segment_id)
SELECT o.id, s.id
FROM organizations o, segments s
WHERE o.slug = 'demo-eda'
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED: SCORE COMPONENTS
-- ============================================

INSERT INTO score_components (company_id, component_name, component_score, weight)
SELECT c.id, 'funding_momentum', 9.0, 1.5 FROM companies c WHERE c.slug = 'form-energy'
ON CONFLICT DO NOTHING;

INSERT INTO score_components (company_id, component_name, component_score, weight)
SELECT c.id, 'expansion_signals', 8.0, 1.2 FROM companies c WHERE c.slug = 'form-energy'
ON CONFLICT DO NOTHING;

INSERT INTO score_components (company_id, component_name, component_score, weight)
SELECT c.id, 'market_position', 8.5, 1.0 FROM companies c WHERE c.slug = 'form-energy'
ON CONFLICT DO NOTHING;

INSERT INTO score_components (company_id, component_name, component_score, weight)
SELECT c.id, 'funding_momentum', 6.0, 1.5 FROM companies c WHERE c.slug = 'joby-aviation'
ON CONFLICT DO NOTHING;

INSERT INTO score_components (company_id, component_name, component_score, weight)
SELECT c.id, 'regulatory_progress', 8.0, 1.3 FROM companies c WHERE c.slug = 'joby-aviation'
ON CONFLICT DO NOTHING;

INSERT INTO score_components (company_id, component_name, component_score, weight)
SELECT c.id, 'expansion_signals', 7.5, 1.2 FROM companies c WHERE c.slug = 'joby-aviation'
ON CONFLICT DO NOTHING;
