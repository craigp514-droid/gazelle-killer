# Signal Taxonomy for Gazelle Killer

**Last Updated:** 2026-02-08
**For:** Todd (data collection) + Waldo (import)

---

## The Core Insight

EDOs care most about companies that **haven't picked a location yet**. A company announcing "we're building a $2B fab" is interesting — but a company saying "we're planning a $2B fab and evaluating sites" is **gold**.

---

## Signal Categories

### 🔴 SITE SEARCH (Score: 9-10)
**Definition:** Company has announced expansion/investment plans but **has NOT chosen a location yet**.

**Why it matters:** EDO can actively pitch their region. This is a live opportunity.

**Examples:**
- "Company X evaluating sites for new manufacturing facility"
- "Company Y seeking incentives for planned $500M expansion"
- "Company Z shortlisted 5 states for new HQ"

**CSV field:** `signal_type = "site_search"`

---

### 🟡 NEW FACILITY (Score: 6-7)
**Definition:** Company announced or completed a facility **at a known location**.

**Why it matters:** Shows growth pattern. Company that built one facility often builds more. Good prospect for their NEXT expansion.

**Examples:**
- "Company X breaks ground on Arizona fab"
- "Company Y opens new Texas manufacturing plant"
- "Company Z announces $1B investment in Ohio"

**CSV field:** `signal_type = "new_facility"`

---

### 🟢 GROWTH SIGNALS (Score: 4-6)
**Definition:** Indicators that company is healthy and growing, may expand soon.

| Type | signal_type value | Score |
|------|-------------------|-------|
| Funding Round | `funding_round` | 5-6 |
| Major Contract Win | `contract_award` | 5-6 |
| Hiring Surge | `hiring_surge` | 4-5 |
| Strategic Partnership | `partnership` | 4-5 |
| Acquisition | `acquisition` | 5-6 |

---

### ⚪ CONTEXT SIGNALS (Score: 1-3)
**Definition:** Background info, not directly actionable.

| Type | signal_type value | Score |
|------|-------------------|-------|
| Leadership Change | `leadership_change` | 3 |
| Earnings Report | `earnings_signal` | 2 |
| Product Launch | `product_launch` | 3 |
| Regulatory Approval | `regulatory_approval` | 4 |

---

## CSV Format for Signals

```csv
company_slug,signal_type,title,description,source_url,signal_date,score
tsmc,site_search,TSMC Evaluating European Sites for 2nm Fab,TSMC considering Germany and France for next advanced fab,https://...,2026-02-01,10
intel,new_facility,Intel Ohio Fab Groundbreaking,Intel breaks ground on $20B Ohio mega-site,https://...,2026-01-15,7
nvidia,funding_round,NVIDIA Raises $5B,NVIDIA closes major funding round,https://...,2026-01-10,5
```

---

## How Waldo Will Display This

- **Site Search signals** get a red/orange badge + prominent placement
- **Filter option:** "Show Site Search Only" on signals feed
- **Company cards** will show if company has active Site Search signal
- **Score** affects company's overall composite score + tier

---

## Questions for Todd

1. Can you flag which of the existing signals are actually "Site Search" vs "New Facility"?
2. For new signals, use `site_search` when location is TBD
3. Any signals in your backlog that fit "Site Search"?

---

*Ping Waldo or Craig with questions.*
