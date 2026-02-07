# Data Import Templates for Gazelle Killer

## Overview

Two separate files:
1. **companies.csv** — Master list of companies (static-ish, update when adding new companies)
2. **signals.csv** — Ongoing signal updates (dynamic, add rows as signals are discovered)

---

## Companies CSV

### Required Fields
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `name` | string | "Anduril Industries" | Company display name |
| `slug` | string | "anduril-industries" | URL-safe lowercase, used for linking |
| `segment_slug` | string | "defense-tech" | Must match existing segment in DB |
| `composite_score` | integer | 9 | 1-10 scale |
| `tier` | string | "A" | A, B, or C (auto-computed from score, but can override) |

### Optional Fields
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `website` | url | "https://anduril.com" | |
| `hq_city` | string | "Costa Mesa" | |
| `hq_state` | string | "CA" | 2-letter state code preferred |
| `country` | string | "USA" | |
| `ownership` | string | "Private" | Private, Public, Subsidiary |
| `ticker` | string | "TSLA" | For public companies |
| `founded_year` | integer | 2017 | |
| `employee_count` | integer | 2500 | From Clay/LinkedIn |
| `linkedin_url` | url | "https://linkedin.com/company/anduril" | |
| `naics_code` | string | "334511" | For EDO filtering |
| `sub_segment` | string | "Counter-UAS" | Finer categorization |
| `messaging_hook` | text | "Position defense manufacturing..." | Suggested outreach angle |
| `notes` | text | "Palmer Luckey founder..." | Research notes |

### Segment Slugs (current)
```
# Semiconductors
fabs-foundries, equipment-frontend, equipment-backend, materials-chemicals, substrates, osat

# Robotics
industrial-robotics, warehouse-robotics, humanoid-robots, medical-robotics, agricultural-robotics, service-robotics

# Battery & Energy Storage
ev-battery, grid-storage, long-duration-storage, battery-components

# Space & Aerospace
launch-services, satellites, space-infrastructure, ground-segment

# Defense & Hypersonics
defense-tech

# Legacy (may exist)
robotics-automation, autonomous-vehicles, space-tech, ai-ml, advanced-materials, clean-energy, hydrogen-fuel-cells, evtol, biotech-life-sciences
```

---

## Signals CSV

### Required Fields
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `company_slug` | string | "anduril-industries" | Must match company slug |
| `signal_type` | enum | "funding_round" | See types below |
| `title` | string | "Anduril Raises $1.5B..." | Short headline |
| `signal_date` | date | "2024-08-15" | YYYY-MM-DD format |

### Optional Fields
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `description` | text | "Anduril closed a..." | Longer description |
| `source_url` | url | "https://techcrunch.com/..." | Source article |
| `strength` | integer | 9 | 1-10, how significant |
| `urgency` | string | "type_1" | type_1 = gold/location TBD, type_2 = strong outreach |

### Signal Types
```
funding_round      — Raised capital
hiring_surge       — Significant hiring activity
new_facility       — Announced/opened new location (TYPE 1 GOLD)
facility_expansion — Expanding existing facility
contract_award     — Won major contract
partnership        — Strategic partnership announced
regulatory_approval — FDA, permits, etc.
ipo_filing         — S-1 filed
acquisition        — Acquired or being acquired
product_launch     — Major product announcement
```

---

## Workflow

### Initial Import
1. Todd preps `companies.csv` with all companies
2. Todd preps `signals.csv` with initial signals
3. Drop both in Google Drive shared folder
4. Waldo runs import script

### Ongoing Signal Updates
1. Todd adds new rows to `signals.csv` (or a Google Sheet)
2. Waldo checks periodically and imports new signals
3. Signals link to companies via `company_slug`

### Adding New Companies
1. Todd adds rows to `companies.csv` (or separate `new-companies.csv`)
2. Waldo imports, skips duplicates

---

## Google Drive Folder

**Todd Bot folder:** `1KIcuC9znucaxNWHTW_qHG61-WZl9Hxd5`

Either:
- Todd drops files here and shares with Waldo Bot account
- Or use a shared "Data Handoff" folder both can access

---

## Questions?

Ping Waldo or Craig.
