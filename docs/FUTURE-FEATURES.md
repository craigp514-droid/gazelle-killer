# Future Features (Post-MVP)

## 🔥 Project Tracker & Investment Heat Map

**Priority:** High (post-MVP)
**Added:** 2026-02-07

### Overview
A project tracking module that captures real-time corporate expansion/investment announcements and visualizes industry momentum. Data collected by a dedicated OpenClaw bot monitoring news sources.

---

### 1. Industry Heat Map - "What's Hot Right Now"

**Theory:** Peer companies in the same segment tend to make investment moves in waves. When one semiconductor fab announces expansion, competitors often follow within 6-18 months.

**Features:**
- Visual heat map showing investment activity by industry/segment
- Time-based view (last 30/90/180 days, YoY comparison)
- Investment volume indicators (deal count, total $ committed)
- Trend arrows showing momentum (heating up vs. cooling down)
- Drill-down from Industry → Segment → Individual projects

**Use case:** EDO sees "Battery - EV Cell Manufacturing" is hot this quarter → prioritizes outreach to battery companies → arrives at conversations with timely, relevant pitch.

---

### 2. Company Investment Pattern Tracking

**Theory:** Companies invest in spurts. A company that builds one facility often builds 2-3 more within 3-5 years as they scale. Catching them mid-spurt is ideal timing.

**Features:**
- Company investment timeline (all announced projects)
- Pattern detection: "This company made 3 investments in the last 5 years"
- Investment velocity scoring (accelerating, steady, dormant)
- Alerts when a tracked company announces a new project
- "Companies likely to invest again soon" predictive list

**Use case:** EDO sees Company X just announced their 2nd plant in 18 months → signals they're in growth mode → high-priority prospect for the 3rd facility.

---

### Data Model (Proposed)

```sql
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  segment_id uuid REFERENCES segments(id),
  project_type text, -- manufacturing, distribution, R&D, HQ, data_center
  announced_date date,
  estimated_investment numeric, -- in dollars
  estimated_jobs integer,
  location_city text,
  location_state text,
  location_country text,
  status text, -- announced, under_construction, operational, cancelled
  source_url text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for aggregations
CREATE INDEX idx_projects_segment ON projects(segment_id);
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_announced ON projects(announced_date);
CREATE INDEX idx_projects_status ON projects(status);
```

### Aggregations Needed
- Projects by segment (last N days)
- Projects by company (lifetime)
- Investment velocity by segment (trend calculation)
- Heat map data (segment × time period matrix)

---

### Data Collection

A separate OpenClaw bot will monitor news sources for project announcements:
- News APIs (Google News, NewsAPI, etc.)
- SEC filings for public companies
- State economic development press releases
- Industry trade publications

Bot populates `projects` table via API or direct database writes.

---

### Dependencies
- [ ] Projects collection bot (to be built)
- [ ] News source integrations
- [ ] Supabase schema migration
- [ ] Heat map visualization component
- [ ] Company timeline component

---

## Other Future Features

### ⌘K Search Enhancements
- Search across signals, not just companies
- Filter by date range in search

### Outreach Draft Button
- AI-generated cold email using messaging hook
- Multiple tone options (formal, casual, technical)

### Admin Panel
- View/manage company requests
- Bulk import UI (upload CSV in browser)
- User management

### Notifications
- Email alerts for new signals on favorited companies
- Weekly digest of segment activity

### Waldo + Todd Collaboration
- Direct Telegram group communication
- Automated data handoffs
