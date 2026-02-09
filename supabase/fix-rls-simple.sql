-- Simplified RLS: Allow any authenticated user to see all data
-- (For MVP, we don't need org-level restrictions)

-- Companies: any authenticated user can view
DROP POLICY IF EXISTS "Users see companies in their segments" ON companies;
CREATE POLICY "Authenticated users see all companies" ON companies 
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Segments: any authenticated user can view
DROP POLICY IF EXISTS "Users see their org segments" ON segments;
CREATE POLICY "Authenticated users see all segments" ON segments 
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Company-segments: any authenticated user can view
DROP POLICY IF EXISTS "Users see company-segment links" ON company_segments;
CREATE POLICY "Authenticated users see all company-segment links" ON company_segments 
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Signals: any authenticated user can view
DROP POLICY IF EXISTS "Users see signals for visible companies" ON signals;
CREATE POLICY "Authenticated users see all signals" ON signals 
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Industries: any authenticated user can view
DROP POLICY IF EXISTS "Users see industries" ON industries;
CREATE POLICY "Authenticated users see all industries" ON industries 
  FOR SELECT USING (auth.uid() IS NOT NULL);
