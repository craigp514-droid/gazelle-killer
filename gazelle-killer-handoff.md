# Gazelle Killer MVP — Coding Bot Handoff

## What This Is

You are building **Gazelle Killer**, a SaaS intelligence platform for Economic Development Organizations (EDOs). EDOs are government/quasi-government agencies responsible for attracting businesses to relocate or expand in their region. This tool helps them identify high-growth companies ("gazelles") by tracking signals like funding rounds, hiring surges, new facilities, and contract awards.

## The Complete Build Plan

The full technical spec is in `gazelle-killer-mvp-plan.md`. Read that file first — it contains the complete database schema (with SQL), RLS policies, triggers, materialized views, and step-by-step build instructions with prompts and verification criteria for each step.

## Key Design Decisions (Context Not in the Plan)

### Terminology
- We use **"Segment"** (not "Sector") everywhere — tables, routes, UI labels. This is the client's preferred terminology for industry groupings like "Battery Storage", "eVTOL", "Advanced Materials", etc.

### Scoring & Tiering
- **Score** is 1-10 (not 0-100). This is the granular composite score.
- **Tier** is auto-computed from score via a Postgres GENERATED column:
  - **Tier A** (score 6-10): Strong signal — hot lead. Funding, facility, contract signals.
  - **Tier B** (score 3-5): In the space, no recent expansion signal — outreach-ready.
  - **Tier C** (score 1-2): Context only (primes, developers) — not active targets.
- Tier is the primary filter EDOs use: "Show me Tier A" = prioritized outreach list.

### Messaging Hook
- Platform-generated field on each company. Translates the latest signal into what the EDO should be saying when they reach out.
- Example: If a company just raised $50M in Series C, the hook might be: "Recent $50M raise signals expansion capacity — position your region's workforce pipeline and tax incentives."
- Generated/updated by the research bot after new signals are inserted.

### Notes Field
- Shared catch-all on the company record (not per-user). Contains:
  - Extra context ("Ex-SpaceX founders", "NASA heritage tech")
  - Important flags ("TYPE 1 LEAD", "Boeing acquisition pending")
  - Technical details ("Iron Nitride magnets", "3D woven composites")
- Populated by the research bot, not by end users.

### No CRM/Pipeline in MVP
- We intentionally removed the Kanban pipeline/CRM. It was over-engineered for this stage.
- Instead, users get **Favorites** — a simple star/pin system to flag and track companies they care about. Per-user, not shared.
- A light CRM is listed as a post-launch feature, only to be built if client feedback demands it.

### Multi-Tenant Architecture
- Organizations (EDO clients) are the tenancy boundary.
- Each org is assigned specific segments they can access.
- RLS enforces all data isolation — no auth checks needed in application code.
- Competing EDOs on the platform cannot see each other's favorites or data scoping.

### Data Flow
- A **research bot** (separate Python system, not part of this build) writes data to Supabase using the `service_role` key, bypassing RLS.
- The **web app** reads data through the Supabase client with RLS active.
- The bot is responsible for: company upserts, signal insertion, score calculation, messaging hook generation, geocoding, and data quality scoring.
- The web app is read-only for company/signal data. Users only write: favorites (bookmarks) and profile updates.

## Company Fields (The Data Model)

Every company has these fields, which appear in both the table view and detail page:

| Field | Source | Description |
|-------|--------|-------------|
| Company | Bot | Company name |
| Website | Bot | Company URL |
| HQ Location | Bot | City + State (+ Country) |
| Employee Count | Bot | Headcount with freshness timestamp |
| Ownership | Bot | Public / Private / Subsidiary / Government |
| Ticker | Bot | Stock ticker if public |
| Founded | Bot | Year founded |
| Parent Company | Bot | Parent org if subsidiary |
| NAICS | Bot | Industry classification codes |
| Segment | Bot | Which segments (Battery Storage, eVTOL, etc.) |
| Tier | Auto | A/B/C — generated from score |
| Score | Bot | Composite score 1-10 |
| Signal Type | Bot | Latest signal type (funding_round, hiring_surge, etc.) |
| Signal | Bot | Latest signal title |
| Signal Date | Bot | Date of latest signal |
| Source URL | Bot | Link to signal source |
| Messaging Hook | Bot | Platform-generated outreach angle |
| Notes | Bot | Catch-all context, flags, technical details |

"Bot" = populated by the research bot. "Auto" = computed by Postgres.

## Table View Default Columns

Not all columns are shown by default in the segment page table. Default visible columns:
**Company, HQ Location, Tier, Score, Signal Type, Signal, Signal Date, Messaging Hook**

All other columns are available via column visibility toggles.

## Build Order

Follow the steps in `gazelle-killer-mvp-plan.md` sequentially:

1. **Step 0** — Manual setup (Supabase project, GitHub repo, API keys)
2. **Step 1** — Database schema + RLS + triggers + seed data
3. **Step 2** — Next.js app shell + auth + design system
4. **Step 3** — Dashboard + segment pages + search
5. **Step 4** — Company detail page
6. **MILESTONE** — Client validation gate (hard stop for feedback)
7. **Step 5** — Favorites / pinned companies
8. **Step 6** — Signals feed + alerts
9. **Step 7** — Export, sharing, board reports
10. **Step 8** — Admin panel + org management

Each step has a detailed prompt and verification checklist. Do not skip the verification steps.

## Future Revenue Opportunity (Do Not Build Yet)

**BRE Monitoring** — a paid add-on where EDOs upload their Business Retention & Expansion company lists and we score, enrich, clean, and monitor them. Priced by territory/list size. Details are in the plan doc under "Future Revenue Opportunity." This is documented for planning purposes only — do not build any BRE features in the MVP.
