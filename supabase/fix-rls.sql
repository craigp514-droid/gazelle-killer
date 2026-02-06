-- Fix RLS infinite recursion on profiles table

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users see own org profiles" ON profiles;
DROP POLICY IF EXISTS "Users see their org segments" ON segments;
DROP POLICY IF EXISTS "Users see companies in their segments" ON companies;
DROP POLICY IF EXISTS "Users see signals for visible companies" ON signals;
DROP POLICY IF EXISTS "Users see company-segment links" ON company_segments;
DROP POLICY IF EXISTS "Users see scores for visible companies" ON score_components;
DROP POLICY IF EXISTS "Users see own org" ON organizations;
DROP POLICY IF EXISTS "Users see own org segments" ON organization_segments;

-- Profiles: users can see their own profile (simple, no recursion)
CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (id = auth.uid());

-- Organizations: users see their own org (join through profiles without recursion)
CREATE POLICY "Users see own org" ON organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Organization segments: use direct join to profiles
CREATE POLICY "Users see own org segments" ON organization_segments FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Segments: accessible if user's org has access
CREATE POLICY "Users see their org segments" ON segments FOR SELECT USING (
  id IN (
    SELECT os.segment_id 
    FROM organization_segments os
    WHERE os.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
);

-- Companies: visible if in an accessible segment
CREATE POLICY "Users see companies in their segments" ON companies FOR SELECT USING (
  id IN (
    SELECT cs.company_id 
    FROM company_segments cs
    WHERE cs.segment_id IN (
      SELECT os.segment_id 
      FROM organization_segments os
      WHERE os.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  )
);

-- Signals: visible if company is visible
CREATE POLICY "Users see signals for visible companies" ON signals FOR SELECT USING (
  company_id IN (
    SELECT cs.company_id 
    FROM company_segments cs
    WHERE cs.segment_id IN (
      SELECT os.segment_id 
      FROM organization_segments os
      WHERE os.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  )
);

-- Company-segments: visible if segment is accessible
CREATE POLICY "Users see company-segment links" ON company_segments FOR SELECT USING (
  segment_id IN (
    SELECT os.segment_id 
    FROM organization_segments os
    WHERE os.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
);

-- Score components: visible if company is visible
CREATE POLICY "Users see scores for visible companies" ON score_components FOR SELECT USING (
  company_id IN (
    SELECT cs.company_id 
    FROM company_segments cs
    WHERE cs.segment_id IN (
      SELECT os.segment_id 
      FROM organization_segments os
      WHERE os.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  )
);
