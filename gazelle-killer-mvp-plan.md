# Gazelle Killer MVP — Revised Build Plan

## Architecture Principles

- **Security at the data layer, not the UI.** RLS policies ship with the schema, not bolted on later.
- **Canonical identifiers everywhere.** No upsert-by-name fragility. Companies get a `slug` and optional external IDs.
- **Optimistic UI with real data.** Skeleton loaders, instant navigation, prefetched routes. The app should feel like a native tool, not a web page.
- **Data freshness is visible.** Every data point shows when it was last updated. Stale data is flagged, not hidden.
- **EDOs think geographically.** Map views and regional filtering are core, not afterthoughts.
- **EDOs report to boards.** Export and share capabilities are first-class features.

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Database & Auth | Supabase (Postgres + Auth + RLS + Realtime) | Row-level security, realtime subscriptions, edge functions |
| Frontend | Next.js 15 (App Router, Server Components) | Streaming SSR, route prefetching, server-side data fetching |
| Styling | Tailwind CSS + shadcn/ui | Production-grade components, consistent design system, fast iteration |
| Charts & Viz | Recharts or Tremor | Clean data visualizations that match the design system |
| Maps | Mapbox GL JS (free tier: 50k loads/mo) | Interactive company location maps, cluster views |
| Email | Resend + React Email | Templated transactional and digest emails |
| Hosting | Vercel | Auto-deploy from GitHub, edge functions, analytics |
| Data Pipeline | Research bot → Supabase service_role API | Bot writes, app reads |

---

## Step 0 — Manual Setup (~10 minutes)

No changes from original. Create Supabase project, GitHub repo, grab API keys.

Additionally:
- Enable Supabase Realtime on the `signals` table (Dashboard → Database → Replication)
- Enable Supabase Auth email provider (on by default)

---

## Step 1 — Database Schema + RLS + Triggers (All at Once)

**Why the change:** The original plan bolted on RLS at Step 6. That means Steps 2-5 are built without security, then you retrofit it and break things. Ship security with the schema.

### Tables

**segments**
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
name            text NOT NULL UNIQUE
slug            text NOT NULL UNIQUE  -- url-safe: 'battery-storage', 'evtol'
description     text
icon            text                  -- icon identifier for sidebar/badges
color           text                  -- hex color for badges/charts
display_order   integer DEFAULT 0     -- control sidebar ordering
created_at      timestamptz DEFAULT now()
```

**companies**
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
slug            text NOT NULL UNIQUE   -- url-safe canonical identifier
name            text NOT NULL
description     text
website         text
logo_url        text
hq_city         text
hq_state        text
hq_country      text DEFAULT 'US'
latitude        numeric               -- for map views
longitude       numeric               -- for map views
employee_count  integer
employee_count_updated_at timestamptz  -- data freshness
founded_year    integer
ownership_type  text CHECK (ownership_type IN ('public','private','subsidiary','government'))
ticker_symbol   text
parent_company  text                  -- parent org name (e.g., 'Boeing', 'Lockheed Martin')
naics_codes     text[]                -- array of NAICS codes for industry classification
composite_score numeric DEFAULT 0 CHECK (composite_score BETWEEN 0 AND 10)  -- 1-10 scale
tier            text GENERATED ALWAYS AS (
                  CASE
                    WHEN composite_score >= 6 THEN 'A'
                    WHEN composite_score >= 3 THEN 'B'
                    ELSE 'C'
                  END
                ) STORED                -- A = hot lead (6-10), B = outreach-ready (3-5), C = context only (1-2)
score_updated_at timestamptz
messaging_hook  text                  -- platform-generated outreach angle based on latest signals
notes           text                  -- catch-all: key facts, flags, technical details ("Ex-SpaceX founders", "TYPE 1 LEAD", "Iron Nitride magnets")
data_quality    integer DEFAULT 0 CHECK (data_quality BETWEEN 0 AND 100)  -- how complete is this record
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

**company_segments**
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
company_id      uuid REFERENCES companies(id) ON DELETE CASCADE
segment_id      uuid REFERENCES segments(id) ON DELETE CASCADE
is_primary      boolean DEFAULT false
UNIQUE(company_id, segment_id)
```

**signals**
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
company_id      uuid REFERENCES companies(id) ON DELETE CASCADE
signal_type     text NOT NULL CHECK (signal_type IN (
                  'funding_round','hiring_surge','new_facility','contract_award',
                  'patent_filing','leadership_change','expansion_announcement',
                  'partnership','acquisition','product_launch','regulatory_approval',
                  'ipo_filing','layoff','facility_closure','relocation'
                ))
title           text NOT NULL
summary         text                  -- short 1-2 sentence summary
description     text                  -- full detail
signal_date     date NOT NULL
source_url      text
source_name     text                  -- 'SEC Filing', 'Press Release', etc.
signal_strength integer CHECK (signal_strength BETWEEN 1 AND 10)
is_negative     boolean DEFAULT false -- layoffs, closures are negative signals
verified        boolean DEFAULT false -- has a human or second source confirmed
created_at      timestamptz DEFAULT now()
```

**score_components**
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
company_id      uuid REFERENCES companies(id) ON DELETE CASCADE
component_name  text NOT NULL
component_score numeric
weight          numeric DEFAULT 1.0   -- how much this component affects composite
updated_at      timestamptz DEFAULT now()
UNIQUE(company_id, component_name)
```

**organizations**
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
name            text NOT NULL
slug            text NOT NULL UNIQUE
logo_url        text
subscription_tier text DEFAULT 'basic' CHECK (subscription_tier IN ('basic','pro','enterprise'))
max_users       integer DEFAULT 5
created_at      timestamptz DEFAULT now()
```

**organization_segments**
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE
segment_id      uuid REFERENCES segments(id) ON DELETE CASCADE
UNIQUE(organization_id, segment_id)
```

**profiles**
```
id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
organization_id uuid REFERENCES organizations(id)
full_name       text
email           text NOT NULL
role            text DEFAULT 'viewer' CHECK (role IN ('admin','viewer'))
avatar_url      text
last_login_at   timestamptz
created_at      timestamptz DEFAULT now()
```

**user_bookmarks**
```
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE
company_id      uuid REFERENCES companies(id) ON DELETE CASCADE
notes           text
created_at      timestamptz DEFAULT now()
UNIQUE(user_id, company_id)
```

*(Pipeline/CRM tables removed from MVP — see "Future Revenue Opportunity: BRE Monitoring" section below for the longer-term CRM direction)*

### Indexes
```sql
CREATE INDEX idx_companies_composite_score ON companies(composite_score DESC);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_location ON companies(hq_state, hq_city);
CREATE INDEX idx_companies_geo ON companies(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_signals_company_date ON signals(company_id, signal_date DESC);
CREATE INDEX idx_signals_date ON signals(signal_date DESC);
CREATE INDEX idx_signals_type ON signals(signal_type);
CREATE INDEX idx_company_segments_company ON company_segments(company_id);
CREATE INDEX idx_company_segments_segment ON company_segments(segment_id);
CREATE INDEX idx_companies_tier ON companies(tier);
CREATE INDEX idx_profiles_org ON profiles(organization_id);
-- Full-text search index
CREATE INDEX idx_companies_search ON companies USING gin(
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(hq_city,'') || ' ' || coalesce(hq_state,'') || ' ' || coalesce(parent_company,'') || ' ' || coalesce(notes,''))
);
```

### Triggers

**Auto-create profile on signup:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Auto-update `updated_at` on companies:**
```sql
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();
```


### RLS Policies (Shipped with Schema)

```sql
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only see segments their org has access to
CREATE POLICY "Users see their org segments" ON segments FOR SELECT USING (
  id IN (
    SELECT os.segment_id FROM organization_segments os
    JOIN profiles p ON p.organization_id = os.organization_id
    WHERE p.id = auth.uid()
  )
);

-- Companies visible if tagged in an accessible segment
CREATE POLICY "Users see companies in their segments" ON companies FOR SELECT USING (
  id IN (
    SELECT cs.company_id FROM company_segments cs
    WHERE cs.segment_id IN (
      SELECT os.segment_id FROM organization_segments os
      JOIN profiles p ON p.organization_id = os.organization_id
      WHERE p.id = auth.uid()
    )
  )
);

-- Signals visible if company is visible
CREATE POLICY "Users see signals for visible companies" ON signals FOR SELECT USING (
  company_id IN (
    SELECT cs.company_id FROM company_segments cs
    WHERE cs.segment_id IN (
      SELECT os.segment_id FROM organization_segments os
      JOIN profiles p ON p.organization_id = os.organization_id
      WHERE p.id = auth.uid()
    )
  )
);

-- Company-segments visible if segment is accessible
CREATE POLICY "Users see company-segment links" ON company_segments FOR SELECT USING (
  segment_id IN (
    SELECT os.segment_id FROM organization_segments os
    JOIN profiles p ON p.organization_id = os.organization_id
    WHERE p.id = auth.uid()
  )
);

-- Score components visible if company is visible
CREATE POLICY "Users see scores for visible companies" ON score_components FOR SELECT USING (
  company_id IN (
    SELECT cs.company_id FROM company_segments cs
    WHERE cs.segment_id IN (
      SELECT os.segment_id FROM organization_segments os
      JOIN profiles p ON p.organization_id = os.organization_id
      WHERE p.id = auth.uid()
    )
  )
);

-- Profiles: users see their own profile and others in their org
CREATE POLICY "Users see own org profiles" ON profiles FOR SELECT USING (
  organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Organizations: users see their own org
CREATE POLICY "Users see own org" ON organizations FOR SELECT USING (
  id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Bookmarks: users see only their own
CREATE POLICY "Users manage own bookmarks" ON user_bookmarks FOR ALL USING (user_id = auth.uid());

-- Organization segments: visible for own org
CREATE POLICY "Users see own org segments" ON organization_segments FOR SELECT USING (
  organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
```

### Database Views (Pre-computed Queries for Performance)

```sql
-- Materialized view for company list pages (avoids expensive joins on every page load)
CREATE MATERIALIZED VIEW company_summary AS
SELECT
  c.id,
  c.slug,
  c.name,
  c.website,
  c.hq_city,
  c.hq_state,
  c.hq_country,
  c.latitude,
  c.longitude,
  c.employee_count,
  c.founded_year,
  c.ownership_type,
  c.ticker_symbol,
  c.parent_company,
  c.naics_codes,
  c.composite_score,
  c.tier,
  c.score_updated_at,
  c.messaging_hook,
  c.notes,
  c.data_quality,
  c.updated_at,
  array_agg(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL) AS segment_ids,
  array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) AS segment_names,
  count(DISTINCT sig.id) FILTER (WHERE sig.signal_date > now() - interval '90 days') AS signals_90d,
  count(DISTINCT sig.id) FILTER (WHERE sig.signal_date > now() - interval '30 days') AS signals_30d,
  max(sig.signal_date) AS last_signal_date,
  (SELECT title FROM signals WHERE company_id = c.id ORDER BY signal_date DESC LIMIT 1) AS latest_signal_title,
  (SELECT signal_type FROM signals WHERE company_id = c.id ORDER BY signal_date DESC LIMIT 1) AS latest_signal_type,
  (SELECT signal_date FROM signals WHERE company_id = c.id ORDER BY signal_date DESC LIMIT 1) AS latest_signal_date,
  (SELECT source_url FROM signals WHERE company_id = c.id ORDER BY signal_date DESC LIMIT 1) AS latest_signal_source_url
FROM companies c
LEFT JOIN company_segments cs ON cs.company_id = c.id
LEFT JOIN segments s ON s.id = cs.segment_id
LEFT JOIN signals sig ON sig.company_id = c.id
GROUP BY c.id;

CREATE UNIQUE INDEX idx_company_summary_id ON company_summary(id);
CREATE INDEX idx_company_summary_score ON company_summary(composite_score DESC);

-- Refresh this on a schedule (Supabase cron or after bot writes)
-- SELECT cron.schedule('refresh-company-summary', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY company_summary');
```

### Seed Data

Same as original: all 12 segments, 5 sample companies with scores, signals, tiers, messaging hooks, and notes. One test organization with access to all segments.

### Verification
- All tables visible in Supabase Table Editor with sample data
- RLS test: query from anon key returns nothing; query with authenticated user returns only their org's data
- Profile auto-created when test user signs up

---

## Step 2 — Next.js App Foundation + Auth + Design System

**What changed:** Not just auth — establish the entire design system and app shell so every subsequent step drops into a polished frame.

### Prompt

"Create a Next.js 15 application with Supabase authentication and a complete app shell. Requirements:

**Foundation:**
- Next.js 15 with App Router and Server Components
- TypeScript throughout
- @supabase/supabase-js and @supabase/ssr configured
- Supabase middleware for session management on all protected routes
- Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

**Design System (using shadcn/ui + Tailwind):**
- Dark sidebar (slate-900) with the product logo at top
- Sidebar sections: Dashboard, Segments (expandable list), Signals Feed, Favorites
- Collapsible sidebar for more screen real estate on data pages
- Top bar with: global search input (command+K shortcut to focus), user avatar dropdown, notification indicator
- Color palette: dark navy/slate sidebar, white/light gray content area, accent color for scores and CTAs
- Consistent card components for data display
- Loading skeleton components that match the layout of every page
- Responsive: sidebar becomes bottom nav on mobile

**Auth Flow:**
- Login page with email/password, clean centered card design
- Sign-up page with full_name, email, password — writes full_name to user metadata (trigger populates profile)
- Forgot password flow
- Protected route middleware — unauthenticated users redirect to /login
- Post-login redirect to /dashboard
- Logout in user dropdown menu
- Update last_login_at on profiles table when user logs in

**App Shell:**
- /dashboard — placeholder 'Welcome' with user's name
- /segments — placeholder
- /signals — placeholder
- /favorites — placeholder
- /settings — placeholder
- /companies/[slug] — placeholder

The shell should feel complete even with placeholder content. Skeleton loaders on every page. Smooth page transitions. The goal is that when we fill in real data in the next steps, the app already feels professional."

### Verification
- `npm run dev` serves the app at localhost:3000
- Sign up creates account + profile row in Supabase
- Login lands on dashboard with user's name
- Sidebar navigation works, all routes resolve
- Responsive layout works on mobile viewport
- Command+K focuses search bar
- Logout works

---

## Step 3 — Dashboard + Segment Pages + Search

**What changed:** Added the dashboard as a real analytics home, added search, added data freshness indicators.

### Prompt

"Build the dashboard home page, segment browsing, and global search for my Next.js app.

**Dashboard (/dashboard):**
- 'Signal Pulse' hero section: total new signals this week, count by type (small spark bars), net new companies added
- 'Top Movers' card: 5 companies with the biggest composite_score increase in the last 30 days (requires tracking — add a `previous_score` column to companies or a `score_history` table if needed)
- 'Latest Signals' feed: 15 most recent signals across all accessible segments, each showing: company name (linked), signal type badge (color-coded by type), title, date, strength dots
- 'Your Watchlist' card: the user's 5 most recently active favorited companies (by latest signal date), with a 'new' indicator if a signal arrived since they last viewed
- 'Segment Heatmap' card: a grid of segment badges showing signal count in the last 7 days per segment, color-intensity indicating activity level

All data fetched server-side using Supabase server client. RLS automatically scopes to user's org.

**Segment Sidebar:**
- Pull segments from Supabase (only those the user's org has access to, enforced by RLS)
- Display in sidebar with icon and name, ordered by display_order
- Show a signal count badge next to each segment (signals in last 7 days)
- Clicking a segment navigates to /segments/[slug]

**Segment Page (/segments/[slug]):**
- Segment header with name, description, total companies, total signals this week
- Company table (use a proper data table component — sortable, with column visibility toggles):
  - Company name (linked to /companies/[slug])
  - Website
  - HQ Location (city, state)
  - Employee Count
  - Ownership type
  - Ticker (if public)
  - Founded year
  - Parent Company
  - NAICS codes
  - Segment tags
  - Tier — displayed as colored badge (A = green, B = yellow, C = gray)
  - Score — displayed as a colored bar (red < 3, yellow 3-5, green 6+) with numeric value (1-10)
  - Signal Type — latest signal type badge
  - Signal — latest signal title
  - Signal Date
  - Source URL — link to source (opens in new tab)
  - Messaging Hook — platform-generated outreach angle
  - Notes — catch-all context
  - Favorite star toggle
- Default sort by composite_score DESC
- Clickable column headers to re-sort
- Column visibility toggles — not all columns shown by default. Default visible: Company, HQ Location, Tier, Score, Signal Type, Signal, Signal Date, Messaging Hook. Others available via toggle.
- Filter bar above table: tier (A/B/C quick filter), ownership type, state, employee range, minimum score
- Clicking a company row navigates to /companies/[slug] for the full detail view
- Toggle between table view and map view (show companies as pins on a Mapbox map, clustered, popup on click with company summary)
- Pagination (25 per page) or infinite scroll

**Global Search (Command+K):**
- Modal search dialog (like Spotlight/Raycast)
- Searches companies using Postgres full-text search (searches name, description, location, parent company, notes)
- Results grouped: Companies, then Segments
- Each result shows name, segment tags, tier, score, location
- Click navigates to company or segment page
- Debounced — searches as you type after 300ms
- Keyboard navigable (arrow keys + enter)

All queries go through Supabase with RLS active — no additional auth checks needed in code."

### Verification
- Dashboard loads with real data from seed
- Segment list in sidebar matches org's accessible segments
- Clicking a segment shows ranked company table with all fields
- Tier filter (A/B/C) works as quick filter
- Sorting works on all columns
- Clicking a company row navigates to detail page
- Map view shows company pins
- Command+K search finds companies by name, city, notes, parent company
- Everything shows loading skeletons before data arrives

---

## Step 4 — Company Detail Page

### Prompt

"Build the company detail page at /companies/[slug].

**Company Header:**
- Company name (large), logo if available
- Website link (opens in new tab), HQ location, employee count, founded year
- Parent company (if applicable)
- Ownership badge ('Public — TICKER', 'Private', 'Subsidiary')
- NAICS codes displayed
- Segment tags as colored chips — each links to /segments/[slug]
- Tier badge (A/B/C with color — green/yellow/gray)
- Data quality indicator (thin progress bar showing completeness)
- 'Last updated X days ago' timestamp
- Favorite toggle button (star/heart)

**Score & Messaging Panel (left column or top section):**
- Large composite score display (1-10) with color ring (think credit score gauge)
- Tier badge prominently displayed
- Score component breakdown: each component as a labeled horizontal bar
- 'Score updated X days ago' freshness note
- Trend: score 30 days ago vs now, with delta and arrow
- **Messaging Hook** — highlighted callout box with the platform-generated outreach angle. This is the first thing an EDO reads when deciding how to approach the company.
- **Notes** — displayed below messaging hook, showing catch-all context (key facts, flags, technical details)

**Signal Timeline (main content area):**
- Chronological feed, most recent first
- Each signal card shows:
  - Date (left gutter or top)
  - Signal type badge (color-coded: green for positive like funding/expansion, red for negative like layoff/closure, blue for neutral like patent/leadership)
  - Title (bold)
  - Summary (1-2 lines)
  - Source link (external, opens new tab)
  - Strength indicator (dots or small bar)
  - Verified badge if verified = true
- Filter bar: signal type, date range, strength minimum
- Infinite scroll or 'load more'

**Signal Stats Sidebar:**
- Total signals: 30d / 90d / 365d
- Signal type breakdown (small bar chart)
- Signal velocity: signals per month over the last 12 months (sparkline)
- Most common signal type
- Average signal strength

**Similar Companies (bottom section):**
- 5 companies in the same primary segment with the closest composite_score
- Each shows name, score, location — linked to their detail page
- Helps EDOs discover related targets

Make the URL /companies/[slug] so it's shareable. Add OpenGraph meta tags so the link previews nicely when shared in Slack/email (company name, tier, score, segment)."

### Verification
- Click any company from segment list → lands on detail page
- Score gauge renders with correct value
- Signal timeline shows all signals, filters work
- Favorite button works, messaging hook and notes display correctly
- Back navigation preserves scroll position on segment page
- URL is shareable and shows preview when pasted in Slack

---

## MILESTONE: Client Validation Gate

**Hard stop.** Do not proceed past this point without showing the product to 2-3 trusted EDO contacts.

Demo script:
1. Log them in
2. Show dashboard signal pulse
3. Click into a segment they care about
4. Click a company they recognize
5. Show signal timeline
6. Use search to find a company by name
7. Show map view

Questions to ask:
- "What data is missing that you'd need to act on this?"
- "How does this compare to what you use today?"
- "If this had [X], would you pay $500/month for your team to access it?"

Their answers determine priority of Steps 5-7.

---

## Step 5 — Favorites / Pinned Companies

**Why this replaces the CRM/Kanban:** A full pipeline tracker is over-engineered for MVP. EDOs need a simple way to flag companies they care about and surface them quickly. Favorites + pinning delivers that with minimal complexity and gets us the stickiness we need — users curate their own watchlist and come back to check on it.

### Prompt

"Build a favorites and pinning system so users can save and prioritize companies.

**Favorites:**
- Star/heart toggle on every company card (segment list, search results, company detail page, signals feed)
- Favoriting is per-user (not shared across the org)
- Uses the existing `user_bookmarks` table
- Optional short note when favoriting (e.g., 'check back after Q2 earnings')

**Pinned Companies (/favorites):**
- Dedicated page showing all favorited companies
- Pinned companies appear at the top of segment list pages (above the default score sort), visually distinguished with a pin icon
- Each card shows: company name, segment tags, tier badge, composite score, signals last 30d, latest signal title + date, messaging hook, the user's note (if any)
- Sort options: date favorited, score, recent signal activity
- Remove favorite button
- Filter by segment

**Dashboard Integration:**
- 'Your Watchlist' card on the dashboard showing the user's 5 most recently active favorited companies (by latest signal date)
- If a favorited company gets a new signal, it surfaces in this card with a 'new' indicator

**Company Detail Integration:**
- Favorite toggle in the company header
- If favorited, show the user's note and date favorited

This is intentionally simple. No stages, no assignments, no activity logs. Just: 'I'm interested in this company, keep it handy.'"

### Verification
- Favorite a company from any surface (segment list, detail page, search)
- Favorited companies appear on /favorites page
- Pinned companies appear at top of segment list pages
- Dashboard watchlist card shows recently active favorites
- Notes persist across sessions
- Favorites are per-user (other org members don't see them)

---

## Step 6 — Signals Feed + Alerts

### Prompt

"Build the signals feed and alert notifications.

**Signals Feed (/signals):**
- Full-page feed of all signals the user has access to, newest first
- Filter bar: segment (multi-select), signal type (multi-select), strength (range slider), date range picker, positive/negative toggle, company name search
- Each signal card: date, company name (linked), segment badges, signal type badge, title, summary, strength, source link
- Favorite toggle on each signal card (saves the company)
- Summary stats bar at top: total signals this week, by type breakdown, top company by signal volume

**Real-time Signal Notifications:**
- Use Supabase Realtime subscriptions on the signals table
- When a new signal arrives for a company in the user's accessible segments:
  - Show a toast notification in the app (if they're active)
  - Increment the notification bell counter in the top bar
- Notification panel (dropdown from bell icon): list of recent signals, mark as read, click to navigate

**Weekly Digest Email (Supabase Edge Function + Resend):**
- Runs weekly via Supabase cron (pg_cron)
- For each user, queries signals from the past 7 days in their org's segments
- Email template (React Email):
  - Header with product branding
  - 'X new signals this week across Y companies'
  - Top 10 signals by strength
  - Score movers: companies with biggest score changes
  - New companies added to tracked segments
  - CTA button: 'View in [Product Name]'
- Unsubscribe link (add email_preferences jsonb column to profiles)
- Use Resend for delivery

Also add a Supabase Edge Function endpoint that the research bot can call after writing new data to trigger a materialized view refresh:
POST /functions/v1/refresh-views → runs REFRESH MATERIALIZED VIEW CONCURRENTLY company_summary"

### Verification
- Signals feed loads, filters work correctly
- Favoriting a company from signal feed works correctly
- Real-time toast appears when a new signal is inserted (test via Supabase dashboard insert)
- Weekly digest email renders correctly (test with Resend test mode)
- Notification bell shows unread count

---

## Step 7 — Export, Sharing, and Board Reports

**Why this matters:** EDOs present to boards, commissions, and elected officials. If they can't get data out of the tool and into a PowerPoint or PDF, they'll screenshot it — which means they won't renew.

### Prompt

"Add export and sharing capabilities throughout the app.

**Company List Export (from segment pages):**
- 'Export' button in the top-right of the company table
- Options: CSV, Excel (.xlsx)
- Exports currently filtered/sorted view
- Columns match what's visible in the table plus full details (description, website, all segment tags, signal count, score breakdown)

**Company Detail Export:**
- 'Export Report' button on company detail page
- Generates a clean PDF (use @react-pdf/renderer or similar):
  - Company header with logo, name, location
  - Score panel with component breakdown
  - Segment tags
  - Signal timeline (last 90 days)
  - Generated date and product branding
- Also offer 'Copy Summary' that puts a formatted text block in clipboard (for pasting into emails)

**Favorites Export:**
- Export favorited companies as CSV/Excel with company details, scores, and recent signals

**Shareable Signal Digests:**
- From the signals feed, select multiple signals and click 'Create Digest'
- Generates a shareable summary page at /share/[token] (public, no auth required, expires after 30 days)
- Contains selected signals with company context
- Useful for EDOs sharing intel with colleagues who don't have accounts

Add share tokens table:
```
share_tokens
  id          uuid PRIMARY KEY
  token       text UNIQUE NOT NULL
  created_by  uuid REFERENCES profiles(id)
  content     jsonb  -- snapshot of the shared data
  expires_at  timestamptz
  created_at  timestamptz DEFAULT now()
```
"

### Verification
- CSV export downloads with correct data
- PDF report renders cleanly
- Share link works in an incognito window (no auth)
- Share link expires after 30 days

---

## Step 8 — Admin Panel + Org Management

### Prompt

"Build the admin panel for organization management.

**Org Admin Panel (/settings, only visible to role='admin'):**
- Organization profile: name, logo upload
- Team members list: name, email, role, last login date
- Invite user: enter email → sends invite via Supabase Auth invite, auto-assigns to this org
- Remove user from org
- Change user role (admin/viewer)
- Segments access: read-only list of which segments the org has access to (controlled by platform admin, not org admin)

**Platform Admin (separate, for you — the product owner):**
- A simple admin route (/admin) protected by a specific user ID or a 'platform_admin' role
- Manage organizations: create new org, assign segment access, set subscription tier, set max users
- View all users across all orgs
- View platform stats: total users, total companies, total signals, signals this week
- Manual user assignment to orgs (for onboarding)
- Trigger materialized view refresh
- This doesn't need to be pretty — functional is fine

Add platform_admin boolean to profiles for this purpose."

### Verification
- Org admin can invite a user by email
- Invited user receives email, signs up, automatically joins the correct org
- Org admin can change roles and remove users
- Platform admin can create orgs and assign segments
- Non-admin users cannot see admin routes

---

## Research Bot Integration

### Prompt

"Create a Python integration script for my research bot to write data to Supabase.

Requirements:
- Uses supabase-py with service_role key (bypasses RLS)
- Company upsert by slug (not name): `upsert_company(slug, data_dict)` — creates or updates
- Auto-generates slug from company name if not provided (slugify)
- Manages segment tags: accepts list of segment names, resolves to IDs, updates company_segments junction table
- Score update: accepts composite_score (1-10 scale) and dict of component scores, updates both tables, records score_updated_at. Tier (A/B/C) is auto-computed by Postgres generated column.
- Messaging hook generation: after inserting new signals, generate/update the messaging_hook field on the company — translates the latest signal into an outreach angle for EDOs
- Signal insertion: `add_signal(company_slug, signal_dict)` — looks up company by slug, inserts signal
- Batch operations: `upsert_companies(list)` and `add_signals(list)` for bulk writes
- Geocoding: if latitude/longitude not provided, use a free geocoding API (Nominatim) to geocode from city+state+country
- Data quality calculation: after upsert, compute data_quality score based on field completeness (% of non-null fields)
- After any write operation, call the refresh-views edge function
- Logging: print summary of operations (X companies upserted, Y signals added, Z errors)
- Error handling: continue on individual record failures, collect errors, report at end

Provide as a single Python file with a clear API that my research bot can import and call."

---

## Deployment Checklist

1. **GitHub repo** — push after every working step
2. **Vercel** — connect repo, set environment variables, auto-deploy on push to main
3. **Custom domain** — point your product domain to Vercel
4. **Supabase production** — when ready to launch:
   - Enable email rate limiting
   - Set up database backups (automatic on paid plan)
   - Enable pg_cron for materialized view refresh and weekly digest
   - Review RLS policies one more time
5. **Monitoring** — Vercel Analytics (free) for web, Supabase dashboard for DB metrics

---

## Feature Priority After Launch

Based on client feedback, likely next features in order:

1. **Custom alerts** — "Tell me when a Battery Storage company in Ohio gets a funding signal above strength 7"
2. **Pipeline / Light CRM** — If users want outreach tracking, add Kanban-style pipeline stages (identified → outreach → in conversation → won/lost). Only build this if client feedback demands it.
3. **Competitor tracking** — Let EDOs mark which companies are being courted by competing regions
4. **API access** — Enterprise clients may want to pull data into their own tools
5. **SSO/SAML** — Enterprise auth requirement (Supabase supports this on Pro plan)
6. **Historical score charts** — Score over time line charts on company detail
7. **Segment intelligence reports** — Auto-generated monthly segment summaries using LLM

---

## Future Revenue Opportunity: BRE Monitoring (Paid Add-On)

**The insight:** Every EDO maintains a Business Retention & Expansion (BRE) list — the companies already in their territory that they're responsible for supporting and retaining. These lists are almost always in messy spreadsheets, outdated CRMs, or someone's head. The data is stale, incomplete, and never scored.

**The offering:** EDOs upload their BRE company list (or we ingest it from their existing systems). We then:

1. **Match & deduplicate** — Resolve their company names against our canonical database, merge duplicates, create new records where needed
2. **Enrich & clean** — Fill in missing data (employee counts, NAICS codes, HQ details, ownership type, geocoding) using the same research bot pipeline
3. **Score** — Apply the same composite scoring model to their BRE companies, giving them a standardized view of which existing businesses are thriving, at risk, or ripe for expansion support
4. **Monitor continuously** — Track signals for their BRE companies the same way we track gazelles — funding rounds, hiring surges, layoffs, facility changes. Alert the EDO when something happens with a company in their territory.
5. **Data quality reporting** — Show the EDO how complete and current their BRE data is, and how it's improving over time

**Why this is potentially bigger than the core product:**
- The core product helps EDOs find *new* companies to attract. BRE monitoring helps them *retain* the ones they already have. Retention is often a bigger part of their mandate.
- Every EDO has a BRE list. It's not optional — it's a core function. This means the addressable market is the same but the urgency is higher.
- The data is already bad everywhere. We're solving a universal pain point.
- It creates deep lock-in — once we're the system of record for their BRE data, switching costs are very high.

**Pricing model:** Tiered by territory size or list size:
- **Small** (under 500 companies): $X/month
- **Medium** (500–2,000 companies): $Y/month
- **Large** (2,000+ companies): $Z/month
- Custom pricing for state-level agencies or large metro areas

**Technical implementation (when ready):**
- Add a `company_source` field: `'platform'` (our gazelle tracking) vs `'bre_import'` (client-uploaded)
- Add `bre_imports` table to track upload batches, org ownership, processing status
- BRE companies are only visible to the uploading org (not shared across the platform)
- Build an upload flow: CSV upload → preview/mapping → processing queue → results dashboard
- Extend the research bot to prioritize BRE companies for enrichment and monitoring
- Add BRE-specific dashboard views: data quality trends, at-risk companies (negative signals), expansion candidates (positive signals)

**Go-to-market:** Offer BRE monitoring as a free trial to the first 2-3 paying EDO clients. Use their feedback to refine, then launch as a paid add-on.
