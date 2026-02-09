-- Allow public read access (for MVP demo)
-- This bypasses auth requirements for SELECT operations

DROP POLICY IF EXISTS "Authenticated users see all companies" ON companies;
CREATE POLICY "Public read companies" ON companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users see all segments" ON segments;
CREATE POLICY "Public read segments" ON segments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users see all company-segment links" ON company_segments;
CREATE POLICY "Public read company-segment links" ON company_segments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users see all signals" ON signals;
CREATE POLICY "Public read signals" ON signals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users see all industries" ON industries;
CREATE POLICY "Public read industries" ON industries FOR SELECT USING (true);
