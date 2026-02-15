# Todd: Recently Expanded Companies — Full Enrichment Task
**Date:** February 14, 2026  
**From:** Waldo  
**Priority:** HIGH

---

## Overview

We imported **637 companies** from Feeny's Project Tracker. These companies have **past projects** (facilities they've already built) but are NOT fully integrated into our database. They need:

1. ✅ **Clay enrichment** — LinkedIn data, employee count, etc.
2. ✅ **Segment assignment** — Put them in the right industry/segment lists
3. ✅ **Signal hunting** — Find active expansion signals (separate task)

**Goal:** These companies should appear in BOTH:
- "Recently Expanded" filter (they already do)
- Their appropriate industry/segment lists (e.g., a battery company should show up in Energy Storage)

---

## Task 1: Segment Assignment

**File:** `companies-need-segments.csv` (538 companies)  
**Location:** Collaboration Folder

### What You'll See

```csv
company_name,website,project_sector,project_state,industry,segment
"ABB",abb.com,"","",, 
"ASML",asml.com,"","Connecticut",,
"Eli Lilly",lilly.com,"Life Sciences","Alabama",,
```

### What To Do

1. **Fill in `industry` and `segment` columns** for companies that fit our tracked industries
2. **Leave blank** if the company doesn't fit any segment (it stays in "Recently Expanded" only)
3. **Add `website`** if missing and you find it

### Available Industries & Segments

Reference file: `available-segments.txt`

**Key industries we track:**
- Life Sciences (Gene Therapy, Cell Therapy, Biomanufacturing, etc.)
- Semiconductors (Fabs, Packaging, Equipment, Materials)
- Energy Storage (Batteries, Grid, etc.)
- Space & Defense
- Advanced Manufacturing
- EVs & Mobility
- Aerospace

### Output Format

Same file, just fill in the blanks:

```csv
company_name,website,project_sector,project_state,industry,segment
"ABB",abb.com,"","","Grid & Energy","Grid Equipment"
"ASML",asml.com,"","Connecticut","Semiconductors","Equipment"
"Eli Lilly",lilly.com,"Life Sciences","Alabama","Life Sciences","Biomanufacturing"
```

### Rules

- **Only assign if confident** — when in doubt, leave blank
- **One segment per company** for now (the primary one)
- If a company could fit multiple segments, pick the best fit
- Don't force it — some companies are general manufacturing and don't fit our specialty segments

---

## Task 2: Clay Enrichment

**This happens automatically** once you submit the segment assignments.

Waldo will:
1. Push all 637 companies to Clay
2. Clay enriches with LinkedIn data
3. Data flows back into platform

**You don't need to do anything** — just submit the segment CSV and Waldo handles the rest.

---

## Task 3: Signal Hunting (Separate)

You already have `new-project-companies-for-todd.csv` for signal hunting.

**Keep these tasks separate:**
- Segment assignment → `companies-need-segments.csv`
- Signal hunting → separate signals CSV (standard format)

---

## Timeline

| Task | Output File | Deadline |
|------|-------------|----------|
| Segment assignment | `companies-segments-done.csv` | Feb 15 EOD |
| Signal hunting | `daily-signals.csv` | Feb 15 8:30am |

---

## How Companies Appear in Lists

| Filter/List | Criteria |
|-------------|----------|
| **Recently Expanded** | Has at least 1 project |
| **Industry (e.g., Life Sciences)** | Has segment assignment in that industry |
| **Segment (e.g., Gene Therapy)** | Has that specific segment assigned |
| **All Companies** | Everyone |

**A company can appear in multiple lists!**  
Example: Eli Lilly with a project → shows in:
- "Recently Expanded" ✓
- "Life Sciences" ✓
- "Biomanufacturing" ✓
- "All Companies" ✓

---

## Files in Collaboration Folder

| File | Purpose |
|------|---------|
| `companies-need-segments.csv` | Input: Companies needing segment assignment |
| `available-segments.txt` | Reference: Valid segment names |
| `new-project-companies-for-todd.csv` | Input: Companies for signal hunting |
| `TODD-ENRICHMENT-INSTRUCTIONS.md` | This file |

---

## Questions?

Ping Waldo if:
- A segment seems missing from the list
- You're unsure how to categorize something
- You find data quality issues

---

*Let's get these companies fully integrated.* 🎯
