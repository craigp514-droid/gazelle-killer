# Gazelle Killer — Project Briefing for Monty

**Date:** 2026-02-08  
**From:** Waldo (Coding Agent)  
**To:** Monty (Strategy Bot)  
**Owner:** Craig Price

---

## What Is Gazelle Killer?

A SaaS intelligence platform for **Economic Development Organizations (EDOs)**. EDOs are state/regional agencies that attract businesses to their jurisdictions. They need to identify high-growth companies ("gazelles") that might expand or relocate.

**The core value prop:** Help EDOs find companies before they announce a location decision, so they can pitch their region.

---

## The Team

- **Craig** — Product owner, EDO domain expert
- **Waldo** — Coding agent, builds the platform
- **Todd** — Data/research agent, collects company intel and signals
- **Monty** — Strategy (you!)

---

## Tech Stack

- **Frontend:** Next.js 15, Tailwind, shadcn/ui
- **Backend:** Supabase (Postgres + Auth + RLS)
- **Repo:** github.com/craigp514-droid/gazelle-killer
- **Data pipeline:** Todd → Google Drive CSV → Waldo imports → Supabase

---

## What's Built (MVP Progress)

### ✅ Done
- **Auth system** — Login, signup, password reset
- **Multi-tenant database** — Organizations, RLS policies
- **Dashboard** — Stats, recent signals, top companies
- **Explore page** — Industry cards (Semiconductors, Robotics, Battery, etc.)
- **All Companies page** — Master list with cascading filters (Industry → Segment)
- **Company profiles** — Score, tier, messaging hook, signals timeline, notes
- **Favorites** — Save companies with personal notes
- **⌘K Search** — Global search with "Request Company" for missing ones
- **Data imported** — 105 semiconductor companies, 14 signals
- **Company logos** — Auto-fetched via Google favicon service
- **Import scripts** — Bulk load companies and signals from CSV

### 🔧 In Progress
- **Signal taxonomy** — Differentiating "Site Search" (location TBD) from other signals
- **Signal scoring** — Making sure high-value signals surface properly

### 📋 Queued (Post-MVP)
- Vercel deployment
- More industries (Battery, Robotics, Space, Defense, Rare Earth)
- LinkedIn descriptions (waiting on Clay enrichment)
- Outreach Draft button (AI-generated cold emails)
- Project Tracker & Investment Heat Map (see FUTURE-FEATURES.md)

---

## Key Concepts

### Company Scoring
- **Score:** 1-10 composite score based on signals and growth indicators
- **Tier:** A (8-10), B (5-7), C (1-4) — auto-computed from score

### Messaging Hook
The killer feature. Each company has a "messaging hook" — a suggested outreach angle that tells an EDO *why* to reach out and *what* to say. Example:
> "$1.5B Series F and major DoD contracts signal rapid expansion — position defense manufacturing and cleared workforce."

### Signal Types (Being Refined)
| Type | Value to EDO |
|------|--------------|
| **Site Search** | 🔥 Location TBD — they can pitch! |
| **New Facility** | Shows growth pattern, good for next expansion |
| **Funding** | Depends on size and stage |
| **Contracts** | Depends on size |
| **Hiring** | Depends on scale |

### Industry Hierarchy
```
Industry (e.g., Semiconductors)
  └── Segment (e.g., Fabs, Equipment, Materials)
        └── Sub-segment (e.g., Leading-Edge Logic, Mature Nodes)
```

---

## Current Challenges

### 1. Signal Differentiation
Not all signals are equal. A "Site Search" (company looking for a location) is gold. A "New Facility" (already announced where) is informative but not actionable. We need clear taxonomy and scoring.

**Status:** Taxonomy doc written, need Todd to apply it to data.

### 2. Signal Scoring Art vs Science
Raw numbers (funding amount, jobs) don't tell the whole story. A $20M Series B for a startup might be more significant than a $200M raise for a giant. Need Todd to apply judgment.

**Status:** Craig discussing with Todd.

### 3. Data Coverage
Currently only have Semiconductors loaded (105 companies). Todd has data for Battery, Robotics, Space, Defense, Rare Earth — need to import.

**Status:** Import scripts ready, waiting on standardized CSVs from Todd.

### 4. Clay Enrichment
Missing some fields (employee count, LinkedIn descriptions, verified HQ). Craig plans to run all data through Clay for enrichment before final import.

**Status:** On hold until more data is ready.

### 5. Group Chat Communication
Craig created a Telegram group with Waldo + Todd, but Waldo isn't receiving messages there yet (config needed). Would streamline collaboration.

**Status:** Pending setup.

---

## Areas to Improve / Strategic Questions

1. **Signal taxonomy** — Is the current Site Search / New Facility / Growth Signal framework right? What are we missing?

2. **Scoring philosophy** — How should Todd weight signals? What heuristics matter?

3. **User journey** — How does an EDO actually use this? Search for companies? Browse by industry? Get alerts? What's the ideal workflow?

4. **Differentiation** — What makes Gazelle Killer better than existing tools (ZoomInfo, Pitchbook, etc.)? The messaging hooks? The signal focus? The EDO-specific framing?

5. **Pricing/packaging** — How would this be sold? Per seat? Per state? Tiered by # of industries?

6. **Data moat** — Todd's research is the moat. How do we systematize and scale his data collection?

7. **Future features** — Project Tracker & Heat Map is queued. What else would make this indispensable?

---

## Key Files

- `/docs/FUTURE-FEATURES.md` — Heat map, project tracker spec
- `/docs/SIGNAL-TAXONOMY.md` — Signal types and scoring (in Drive too)
- `/data-templates/` — CSV formats for Todd
- `/scripts/import-companies.ts` — Bulk import script
- `/scripts/import-signals.ts` — Signal import script

---

## Links

- **Supabase:** https://wtqjdiahlcjqtwvdzlss.supabase.co
- **Repo:** github.com/craigp514-droid/gazelle-killer
- **Shared Drive:** "Waldo Bot" folder for data handoffs

---

Welcome to the team, Monty. Craig can fill you in on the strategic vision — I handle the building. Let's make this thing crush. 🚀

— Waldo
