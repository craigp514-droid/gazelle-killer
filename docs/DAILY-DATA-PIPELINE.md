# Daily Data Pipeline: Todd → Waldo → Platform

**Goal:** Fully automated daily updates. No manual triggers needed.

---

## The Data Flow

```
TODD (Morning)                     WALDO (Automated)
─────────────────────────────────────────────────────────────────
                                   
1. Signal Scan (7-8:30am)          
   └─► daily-signals-YYYY-MM-DD.csv
                                   2. Import Signals (9am cron)
                                      └─► Creates companies if new
                                      └─► Adds signals to existing
                                   
3. New Company Lists (as needed)   
   └─► companies-to-add.csv        4. Import Companies (9am cron)
                                      └─► Adds to All Companies
                                   
                                   5. Push to Clay (10am cron)
                                      └─► New companies → Clay webhook
                                   
                                   6. Import Clay Enrichment (11am cron)
                                      └─► Google Sheet → Supabase
```

---

## File Locations (Collaboration Folder)

| File | Owner | Purpose |
|------|-------|---------|
| `daily-signals-YYYY-MM-DD.csv` | Todd | Daily signal drops |
| `companies-to-add.csv` | Todd | Bulk company additions (no signal) |
| `Clay-Enrichment-Output` | Clay/Waldo | Enrichment data returns |

---

## Todd's Daily Checklist

### Morning Signal Scan (7-8:30am)
1. Run SEC/news/earnings scan
2. Identify 3-10 signals worth adding
3. Format into `daily-signals-YYYY-MM-DD.csv`:

```csv
company_name,company_slug,is_new_company,website,hq_city,hq_state,industry,segment,signal_type,signal_title,signal_date,signal_score,source_url,messaging_hook,notes
"Shield AI","shield-ai",true,https://shield.ai,San Diego,CA,defense,Defense Tech,FUNDING_LADDER,"$240M Series F led by L3Harris",2026-02-14,8,https://...,"""Congrats on the round — what's the facility plan?""",""
```

4. Drop in Collaboration Folder
5. Done — Waldo picks it up at 9am

### Bulk Company Adds (As Needed)
For companies WITHOUT signals (list building):

```csv
company_name,company_slug,website,hq_city,hq_state,industry,segment
"Acme Corp","acme-corp",https://acme.com,Austin,TX,robotics,Industrial Automation
```

Drop as `companies-to-add.csv` — Waldo imports at 9am.

---

## Waldo's Cron Jobs

| Time | Job | What It Does |
|------|-----|--------------|
| **9:00 AM** | Import Signals | Read `daily-signals-*.csv`, create companies + signals |
| **9:05 AM** | Import Companies | Read `companies-to-add.csv`, add to All Companies |
| **10:00 AM** | Push to Clay | Send new companies (no LinkedIn data) to Clay webhook |
| **11:00 AM** | Import Enrichment | Pull from Google Sheet, update company records |

---

## Company Flow

```
New company arrives (via signal OR list)
         │
         ▼
    ┌─────────────────┐
    │  All Companies  │  ◄── Visible immediately
    └─────────────────┘
         │
         ▼
    ┌─────────────────┐
    │  Signal Watch   │  ◄── No segment assigned yet
    └─────────────────┘
         │
         ▼
    Todd reviews queue
         │
         ▼
    ┌─────────────────┐
    │ Assigned Segment│  ◄── Proper categorization
    └─────────────────┘
```

---

## Segment Assignment Queue

Companies without segments go to "Signal Watch" (uncategorized).

**Todd's Review Process:**
1. Waldo generates `review-queue.csv` daily (companies with no segment)
2. Todd adds segment column
3. Drops back in Collaboration Folder
4. Waldo imports segment assignments

OR (future): In-platform UI for segment assignment.

---

## Key Rules

1. **Every signal creates/updates a company** — No orphan signals
2. **Every company shows in All Companies** — Regardless of segment
3. **No manual triggers** — Crons handle everything
4. **Never skip data** — If company not found, create it
5. **Enrichment is async** — Company visible before Clay data arrives

---

## Error Handling

| Scenario | What Happens |
|----------|--------------|
| Company not found | Create it automatically |
| Duplicate signal | Skip (same company + type + date) |
| Clay enrichment fails | Company still visible, just missing LinkedIn data |
| CSV format error | Log error, continue with valid rows |

---

## Status Check Commands

```bash
# Check what's pending
ls -la Collaboration\ Folder/daily-signals-*.csv

# Manual signal import
node scripts/import-daily-signals.js path/to/file.csv

# Manual Clay push
./scripts/push-to-clay.sh

# Manual enrichment import
node scripts/import-clay-enrichment.js

# Check company count
psql: SELECT COUNT(*) FROM companies;

# Check signal count  
psql: SELECT COUNT(*) FROM signals;
```

---

## Questions for Todd

1. **Signal CSV timing** — Is 8:30am drop realistic daily?
2. **Bulk lists** — How often do you add companies without signals?
3. **Segment assignment** — CSV review or want platform UI?
4. **Clay priority** — Should we only enrich companies with signals? Or all new companies?

---

*This pipeline runs daily. The platform stays fresh without manual intervention.*
