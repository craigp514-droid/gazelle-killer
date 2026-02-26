-- Demo requests table
CREATE TABLE IF NOT EXISTS demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  organization text NOT NULL,
  role text,
  created_at timestamptz DEFAULT now(),
  contacted_at timestamptz,
  notes text
);

-- Allow inserts from anon (public form)
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON demo_requests
  FOR INSERT TO anon
  WITH CHECK (true);

-- Only authenticated users can read
CREATE POLICY "Allow authenticated reads" ON demo_requests
  FOR SELECT TO authenticated
  USING (true);
