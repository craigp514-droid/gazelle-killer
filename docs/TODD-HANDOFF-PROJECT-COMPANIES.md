# Todd Handoff: Project Companies Signal Hunt
**Date:** February 14, 2026  
**From:** Waldo  
**To:** Todd

---

## Context

Feeny just loaded **557 new companies** into the database from the Master Project Tracker. These are companies that have **recently completed or announced facility projects** in the US.

**Your mission:** Search these companies for active expansion signals.

---

## What You're Looking For

These companies have **proven they expand**. Look for signals that suggest they're doing it again:

| Signal Code | What to Look For |
|-------------|------------------|
| `SERIAL_EXPANDER` | History of multiple facilities, pattern of growth |
| `SITE_SEARCH` | Active location search (JLL, CBRE hired, RFPs) |
| `INVESTMENT_PLAN_ANNOUNCED` | Public capex commitment, not yet sited |
| `FUNDING_LADDER` | Recent funding that could fuel expansion |
| `REGULATORY_MILESTONE` | FDA approval, permits that unlock capacity needs |
| `CONTRACT_WIN` | Major contract requiring new capacity |

**Key insight:** A company that just built a $500M plant and has strong growth signals is a **SERIAL_EXPANDER** — they'll do it again.

---

## Output Format

Same as daily signals:

```csv
company_name,website,industry,segment,sub_segment,signal_code,signal_score,signal_date,signal_text,source_url,messaging_hook
```

**For new signals on existing companies:**
- Match by company name (case-insensitive)
- Leave website blank if company exists

---

## Company List

**File:** `new-project-companies-for-todd.csv`  
**Location:** Collaboration Folder  
**Count:** 557 companies

I'll generate this file with:
- Company name
- State (where they just built)
- Sector
- Capex ($M)
- Project notes

---

## New Filter: "Companies that Recently Expanded"

Craig wants a dropdown filter on All Companies for **"Recently Expanded"** — companies with at least one project in the database.

This is already queryable (companies with projects). Waldo will add the UI filter.

---

## Timeline

| Task | Owner | Deadline |
|------|-------|----------|
| Signal hunt on 557 companies | Todd | Feb 15 morning |
| Drop signals CSV | Todd | Feb 15 8:30am |
| Import signals | Waldo (auto) | Feb 15 9am |
| Push to Clay | Waldo (auto) | Feb 15 10am |
| Clay enrichment import | Waldo (auto) | Feb 15 11am |

---

## Clay Push

New companies from your signal drops auto-queue for Clay enrichment. The daily pipeline handles this:

1. 9am: Import signals (creates companies if needed)
2. 10am: Push unenriched companies to Clay
3. 11am: Import Clay enrichment data

**No manual action needed** — just drop the CSV by 8:30am.

---

## Questions?

- **Signal taxonomy:** See `docs/SIGNAL-TAXONOMY.md`
- **CSV format:** See `data-templates/signals-template.csv`
- **Ping Waldo** if something's unclear

---

*Let's find the next expansion before they announce it.* 🎯
