# Multi-Signal Data Schema
## For Waldo Platform Integration

---

## Problem
Current CSV has ONE signal per company. Reality: companies have MULTIPLE signals over time from MULTIPLE sources.

---

## Proposed Solution: Separate Signals Table

### Companies Table (existing, simplified)
| Field | Type | Description |
|-------|------|-------------|
| company_id | string | Unique identifier (slug) |
| name | string | Company name |
| website | string | Primary domain |
| hq_location | string | Headquarters |
| country | string | Country code |
| employees | int | Employee count |
| ownership | enum | Public/Private/JV |
| ticker | string | Stock ticker (if public) |
| cik | string | SEC CIK number (if public) |
| industry | string | Top-level industry |
| segment | string | Industry segment |
| sub_segment | string | Sub-segment |
| tier | enum | A/B/C |
| **current_score** | int | Highest active signal score (computed) |
| **signal_count** | int | Number of active signals (computed) |

### Signals Table (NEW)
| Field | Type | Description |
|-------|------|-------------|
| signal_id | string | Unique identifier |
| company_id | string | FK to companies |
| signal_type | enum | See taxonomy below |
| signal_tier | int | 1-6 per taxonomy |
| headline | string | Short description (100 chars) |
| details | text | Full signal context |
| score | int | 1-10 |
| signal_date | date | When signal occurred |
| discovered_date | date | When we found it |
| expiry_date | date | When signal becomes stale (optional) |
| status | enum | active/stale/superseded |
| **sources** | array | See sources schema |

### Sources (embedded in Signals)
| Field | Type | Description |
|-------|------|-------------|
| source_type | enum | sec_edgar/news/earnings_call/job_posting/press_release/website |
| url | string | Direct link |
| title | string | Article/filing title |
| date | date | Source publication date |
| excerpt | text | Relevant quote (optional) |

---

## Signal Type Taxonomy

| Tier | Type Code | Description | Default Score Range |
|------|-----------|-------------|---------------------|
| 1 | `site_search` | Location TBD, RFP issued | 9-10 |
| 1 | `site_selection_consultant` | Hired site selector | 9-10 |
| 2 | `capacity_constrained` | "At capacity" language | 8-9 |
| 2 | `evaluating_expansion` | Considering growth | 8-9 |
| 3 | `major_funding` | Large raise/grant | 6-9 |
| 3 | `pe_acquisition` | Private equity buyout | 7-8 |
| 3 | `chips_award` | CHIPS Act funding | 7-9 |
| 4 | `new_ceo` | Leadership change | 6-8 |
| 4 | `major_contract` | Big customer win | 6-8 |
| 5 | `job_posting_site_selection` | Site selection role | 8 |
| 5 | `job_posting_real_estate` | Real estate director | 7-8 |
| 5 | `job_posting_ops` | Ops expansion roles | 6-7 |
| 6 | `facility_announced` | Location decided | 5-7 |
| 6 | `facility_opened` | Already operational | 4-5 |
| 6 | `acquisition` | M&A activity | 5-7 |

---

## Example: Wolfspeed Multi-Signal

```json
{
  "company_id": "wolfspeed",
  "name": "Wolfspeed",
  "cik": "895419",
  "current_score": 9,
  "signal_count": 4,
  "signals": [
    {
      "signal_id": "wolf-001",
      "signal_type": "chips_award",
      "signal_tier": 3,
      "headline": "CHIPS Act preliminary terms for SiC expansion",
      "score": 8,
      "signal_date": "2024-10-01",
      "status": "active",
      "sources": [
        {
          "source_type": "press_release",
          "url": "https://www.nist.gov/news-events/news/2024/10/biden-harris-administration-announces-preliminary-terms-wolfspeed",
          "date": "2024-10-01"
        }
      ]
    },
    {
      "signal_id": "wolf-002",
      "signal_type": "facility_announced",
      "signal_tier": 6,
      "headline": "Siler City NC SiC fab topped out",
      "score": 7,
      "signal_date": "2024-03-01",
      "status": "active",
      "sources": [
        {
          "source_type": "news",
          "url": "https://www.bizjournals.com/triangle/news/2024/03/wolfspeed-siler-city.html",
          "date": "2024-03-15"
        }
      ]
    },
    {
      "signal_id": "wolf-003",
      "signal_type": "capacity_constrained",
      "signal_tier": 2,
      "headline": "59 SEC filings mention expansion/capacity",
      "details": "High volume of SEC 8-K filings discussing capacity constraints and expansion plans",
      "score": 9,
      "signal_date": "2025-01-01",
      "status": "active",
      "sources": [
        {
          "source_type": "sec_edgar",
          "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=895419",
          "title": "SEC EDGAR Filing Search",
          "date": "2026-02-08",
          "excerpt": "59 filings matching expansion keywords since 2024"
        }
      ]
    },
    {
      "signal_id": "wolf-004",
      "signal_type": "facility_announced",
      "signal_tier": 6,
      "headline": "Marcy NY expansion underway",
      "score": 6,
      "signal_date": "2024-06-01",
      "status": "active",
      "sources": [
        {
          "source_type": "news",
          "url": "https://www.governor.ny.gov/news/wolfspeed-marcy",
          "date": "2024-06-01"
        }
      ]
    }
  ]
}
```

---

## CSV Format (Flat Export)

For CSV compatibility, signals can be flattened:

```
company_id,signal_id,signal_type,signal_tier,headline,score,signal_date,source_type,source_url
wolfspeed,wolf-001,chips_award,3,CHIPS Act preliminary terms,8,2024-10-01,press_release,https://...
wolfspeed,wolf-002,facility_announced,6,Siler City NC fab topped out,7,2024-03-01,news,https://...
wolfspeed,wolf-003,capacity_constrained,2,59 SEC filings re expansion,9,2025-01-01,sec_edgar,https://...
```

---

## Computed Fields

For the **companies table**, these are derived from signals:

| Field | Computation |
|-------|-------------|
| current_score | MAX(score) where status='active' |
| signal_count | COUNT(*) where status='active' |
| best_signal_type | signal_type of highest-scoring active signal |
| last_signal_date | MAX(signal_date) where status='active' |
| has_site_search | EXISTS signal_type='site_search' |

---

## Signal Lifecycle

```
NEW → ACTIVE → STALE → ARCHIVED
              ↓
          SUPERSEDED (replaced by newer signal)
```

**Stale rules:**
- `site_search`: 6 months (they decide or go quiet)
- `capacity_constrained`: 12 months
- `facility_announced`: 24 months (until opened)
- `job_posting_*`: 3 months

---

## For Waldo

This schema allows:
1. ✅ Multiple signals per company
2. ✅ Multiple sources per signal
3. ✅ Signal history over time
4. ✅ Source verification (every signal has URL)
5. ✅ Signal scoring with context
6. ✅ Computed "best score" for company-level views
7. ✅ Signal expiry/lifecycle management

Questions for Waldo:
- Preferred data format? (JSON, CSV, PostgreSQL?)
- Real-time updates or batch?
- Signal deduplication logic?
