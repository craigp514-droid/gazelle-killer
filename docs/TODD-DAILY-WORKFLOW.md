# Todd's Daily Workflow

## Files in Shared Folder

| File | Who Updates | Purpose |
|------|-------------|---------|
| `signals-current-LATEST.csv` | Waldo (6am) | **Your reference** - all signals currently in platform |
| `signals-current-YYYY-MM-DD.csv` | Waldo (6am) | Daily snapshot (for history) |
| `clay-queue-for-waldo.csv` | You (9am) | **New companies** to add |
| `signal-corrections.csv` | You (anytime) | **Corrections** to existing data |

---

## Daily Schedule

| Time | Who | What |
|------|-----|------|
| 6am | Waldo | Exports current signals to `signals-current-LATEST.csv` |
| 8am | Todd | Signal scans → add to your queue |
| 9am | Todd | Copy new companies to `/Users/craigprice/.openclaw/workspace/data/clay-queue-for-waldo.csv` |
| 10am | Waldo | Process corrections → Import new companies → Push to Clay |
| 11am | Waldo | Pull Clay enrichment |

---

## How to Submit Corrections

Create `signal-corrections.csv` in the shared folder:

```csv
company_slug,field,new_value
apptronik,website,https://apptronik.com
acme-corp,source_url,https://new-source.com/article
bad-company,DELETE,
```

### Supported Fields

**Company-level (updates the company):**
- `website` - Company website URL
- `description` - Company description
- `messaging_hook` - Outreach angle

**Signal-level (updates the signal):**
- `source_url` - Signal source link
- `signal_type` - Type of signal
- `signal_tier` - Tier (1-6)
- `status` - active/inactive

**Special:**
- `DELETE` - Removes the signal entirely (leave new_value empty)

### Notes
- Use `company_slug` from the export file (not company name)
- File is auto-renamed to `signal-corrections-processed-YYYY-MM-DD.csv` after processing
- Create a fresh `signal-corrections.csv` for each batch

---

## Checking Your Work

Before adding new signals, check `signals-current-LATEST.csv`:
1. Is the company already in there?
2. Does it already have a signal of this type?
3. Is the existing data correct?

This prevents duplicates and lets you spot broken links or outdated info.
