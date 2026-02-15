# Gazelle Killer Status Update
**Date:** February 14, 2026  
**For:** Monty (Strategy)  
**From:** Waldo (Dev)

---

## Executive Summary

The platform is **functional and live** (localhost). Core data pipeline is automated. We've made significant strategic pivots that clarified what a "signal" actually is, cleaned up legacy data, and established a sustainable daily workflow.

**Key numbers:**
- 542 companies in database
- 36 real signals (pre-announcement opportunities)
- 94 past projects (post-announcement, for reference)
- 25 Life Sciences companies added today (Gene Therapy + Cell Therapy)
- Daily pipeline: automated at 9am/10am/11am

---

## Original MVP Scope vs. Delivered

| Feature | Original Scope | Status | Notes |
|---------|---------------|--------|-------|
| Company Database | ✅ | **DONE** | 542 companies, 11 industries |
| Search & Filters | ✅ | **DONE** | ⌘K search, industry/segment filters |
| Signal Tracking | ✅ | **DONE** | 26 signal types, 3 tiers |
| Signal Cards UI | ✅ | **DONE** | Dashboard + feed per your spec |
| Company Profiles | ✅ | **DONE** | Score, tier, signals, projects, LinkedIn |
| Favorites | ✅ | **DONE** | With personal notes |
| Clay Enrichment | ✅ | **DONE** | Two-way: push + pull via Google Sheet |
| Daily Pipeline | ✅ | **DONE** | Automated crons |
| Territory Matching | ⏳ | **NOT STARTED** | Phase 2 |
| Target List Mgmt | ⏳ | **PARTIAL** | Favorites only, no CRM/Kanban |
| Reporting/Analytics | ⏳ | **NOT STARTED** | Phase 2 |
| Deploy to Vercel | ⏳ | **NOT STARTED** | Ready when you are |

---

## Strategic Pivots (Adjusted Scope)

### 1. Signal vs. Project Distinction
**Before:** "Signal" meant any expansion activity  
**After:** Clear separation:
- **Signal** = Pre-announcement (location TBD, actively searching) → Todd's domain
- **Project** = Post-announcement (location decided, building) → Feeny's domain

This is huge. We deleted 273 "signals" that were actually projects. Signal Tracker now shows **real opportunities only**.

### 2. Signal Taxonomy v2.1
Todd defined 26 signal codes across 3 tiers:
- **Tier 1 (Score 9-10):** SITE_SEARCH, GOV_EQUITY
- **Tier 2 (Score 7-8):** FUNDING_LADDER, CONTRACT_WIN, OEM_PARTNER, etc.
- **Tier 3 (Score 5-6):** PE_BACKED, TARIFF_PRESSURE, etc.

### 3. Messaging Hooks = Signal-Only
Companies without signals get **blank hooks**. No fake outreach angles for watchlist companies.

### 4. Past Projects Section
New `projects` table + UI on company detail pages. Shows:
- Location, jobs, project type
- FDI origin (foreign investment flag)
- Announcement date, source

### 5. Daily Automated Pipeline
```
Todd (8:30am) → CSV drop
Waldo (9am)   → Import signals + create companies
Waldo (10am)  → Push to Clay
Waldo (11am)  → Import Clay enrichment
```
No manual triggers needed.

---

## What's Built (Technical)

### Database
- `companies` — 542 records, enriched via Clay
- `signals` — 36 real pre-announcement signals
- `projects` — 94 past projects
- `segments` — 47 segments across 11 industries
- `company_segments` — many-to-many linking
- `user_bookmarks` — favorites with notes

### UI Pages
- `/dashboard` — Stats + Recent Signals cards (daily retention hook)
- `/companies` — All Companies with filters, pagination
- `/companies/[slug]` — Detail page (signals, projects, LinkedIn, hooks)
- `/signals` — Signal feed with Gold Lead filter
- `/explore` — Industry cards
- `/favorites` — User's saved companies

### Integrations
- **Clay:** Webhook push + Google Sheet pull
- **Google Drive:** Collaboration folder for Todd/Feeny handoffs
- **Supabase:** Auth, database, RLS

### Scripts
- `import-daily-signals.js` — Todd's CSV → Supabase
- `import-projects.js` — Feeny's CSV → Supabase
- `import-clay-enrichment.js` — Google Sheet → Supabase
- `push-to-clay.sh` — Supabase → Clay webhook

---

## What's NOT Done Yet

### Phase 2 (Next)
| Feature | Priority | Effort |
|---------|----------|--------|
| Deploy to Vercel | HIGH | 1 day |
| Signal taxonomy schema (signal_code column) | HIGH | 2 hours |
| Compound signal detection | MEDIUM | 1 day |
| Todd's segment review UI | MEDIUM | 1 day |
| Outreach Draft button (AI-generated emails) | MEDIUM | 2 days |

### Phase 3 (Later)
| Feature | Priority | Notes |
|---------|----------|-------|
| Territory matching | LOW | Needs requirements |
| Reporting/analytics dashboard | LOW | Needs requirements |
| Multi-tenant orgs | LOW | MVP is single-tenant |
| Alert system (Tier 1 signals) | LOW | Nice to have |

---

## Current Data Quality

| Metric | Count | Quality |
|--------|-------|---------|
| Total companies | 542 | ✅ Clean |
| With signals | 36 | ✅ Verified pre-announcement |
| With projects | 94 | ✅ Deduplicated |
| With LinkedIn data | ~490 | ✅ Clay-enriched |
| With messaging hooks | 37 | ✅ Signal-only |
| Life Sciences (new) | 53 | ✅ Gene + Cell Therapy |

---

## Team Workflow (Established)

| Agent | Role | Daily Task |
|-------|------|------------|
| **Todd** | Signal Hunter | 8am scan → CSV drop by 8:30am |
| **Waldo** | Platform Dev | Automated imports 9am/10am/11am |
| **Feeny** | Project Tracker | Past projects, data cleanup |
| **Monty** | Strategy | Specs, priorities, pipeline design |

---

## Questions for Monty

1. **Vercel deploy** — Ready to go live? Any blockers?
2. **Territory matching** — What does this feature look like? Need spec.
3. **Reporting** — What metrics matter most for EDOs?
4. **Compound signals** — Prioritize now or later?
5. **Segment review UI** — Todd prefers platform UI over CSV. Build it?

---

## Bottom Line

The platform works. The pipeline is automated. The data is clean.

We pivoted from "track everything" to "track real opportunities" — which is the right move. Signal Tracker now shows companies BEFORE they've decided where to build.

**Next milestone:** Deploy to Vercel and get it in front of real users.

---

*— Waldo 🦎*
