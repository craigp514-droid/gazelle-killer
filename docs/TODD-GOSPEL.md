# TODD'S DAILY SIGNAL WORKFLOW
## The Gospel - Follow This Exactly

---

## YOUR ONE JOB

Fill out `daily-signals.csv` with complete signal data. That's it.

---

## THE FILE: daily-signals.csv

Copy from `daily-signals-TEMPLATE.csv` to create `daily-signals.csv`

### Required Columns (ALL must be filled)

| Column | What It Is | Example |
|--------|-----------|---------|
| company_name | Company name | Energy Vault |
| website | Company website | energyvault.com |
| signal_type | Type of signal | funding_round |
| signal_tier | Priority 1-6 (1=hottest) | 3 |
| signal_date | When signal occurred | 2026-02-18 |
| title | One-line description | $135.5M financing closed |
| source_url | Link to source | https://businesswire.com/xxx |
| messaging_hook | Outreach angle for EDOs | New financing + major supply deal |

### Signal Types (use these exact values)
- funding_round
- partnership  
- expansion_announcement
- contract_win
- site_search (GOLD - location TBD)
- hiring_surge
- leadership_change
- product_launch

### Signal Tiers
- 1-2: 🔥 HOT (site search, major expansion imminent)
- 3-4: WARM (funding, partnerships, growth signals)
- 5-6: WATCH (early indicators, news worth tracking)

---

## DAILY SCHEDULE

| Time | You Do | Waldo Does |
|------|--------|-----------|
| 6am | — | Exports signals-current-LATEST.csv |
| 8am | Signal scan, research | — |
| 9am | Add rows to daily-signals.csv | — |
| 10am | — | Processes your file, reports to Craig |
| 11am | — | Imports Clay enrichment |

---

## STEP BY STEP

### Morning (8-9am)

1. **Check what's already in platform**
   - Open `signals-current-LATEST.csv`
   - Don't duplicate existing signals

2. **Do your scans**
   - SEC EDGAR, news, funding databases
   - Your campaign databases for research

3. **For each signal found, add a row to daily-signals.csv**
   - ALL columns must be filled
   - One signal per row
   - New company? Still add it - Waldo creates it

4. **Save the file**
   - Must be named exactly: `daily-signals.csv`
   - Must be in the shared folder

### What Happens at 10am

Waldo processes your file:
- ✅ Creates new companies (if not in database)
- ✅ Creates signal records (shows in Signal Feed)
- ✅ Updates messaging hooks
- ✅ Pushes new companies to Clay
- ✅ Renames your file to `daily-signals-processed-DATE.csv`
- ✅ Reports everything to Craig

### If Something Fails

Waldo tells Craig:
- "Row 3: Missing required field for 'Acme Corp'"
- "Hydrostor: Duplicate signal skipped"

Fix it and add to tomorrow's file.

---

## WHAT YOU STOP DOING

❌ clay-queue.csv - GONE
❌ signal-corrections.csv - GONE  
❌ Updating local CSVs as source of truth - GONE

## WHAT YOU KEEP DOING

✅ Morning scans at 8am
✅ Research in your campaign databases
✅ Check signals-current-LATEST.csv for duplicates
✅ ONE OUTPUT: daily-signals.csv

---

## EXAMPLES

### New Company + Signal
```
Hydrostor,hydrostor.ca,partnership,4,2026-02-18,Baker Hughes equity investment,https://source.com,Major OEM backing for compressed air storage
```
→ Waldo creates Hydrostor company + signal record + pushes to Clay

### Existing Company + New Signal
```
Energy Vault,energyvault.com,funding_round,3,2026-02-18,$135.5M financing closed,https://businesswire.com/xxx,New financing closed Feb 2026
```
→ Waldo finds Energy Vault + creates signal record + updates messaging hook

---

## FILES IN SHARED FOLDER

| File | Purpose | Who Updates |
|------|---------|-------------|
| daily-signals.csv | YOUR INPUT | Todd (morning) |
| daily-signals-TEMPLATE.csv | Copy this to start | — |
| daily-signals-processed-DATE.csv | Archive | Waldo (auto) |
| signals-current-LATEST.csv | What's in platform | Waldo (6am) |

---

## REMEMBER

1. **Every column must be filled** - incomplete rows get rejected
2. **One signal per row** - not one company per row
3. **Check for duplicates first** - same company + date + type = skip
4. **File must be named daily-signals.csv** - exactly

This is the gospel. Follow it.
