# Signal Cards UI Spec
**Status:** Draft  
**Author:** Waldo  
**Date:** 2026-02-09

---

## Current State

The Signal Cards UI (`/signals` page + `SignalCard` component) is functional with:
- ✅ Grid layout (responsive 2-4 columns)
- ✅ Company logo via Clearbit
- ✅ Industry + Segment badges
- ✅ Signal type badge with GOLD LEAD treatment for `site_search`
- ✅ Filter tabs: All Signals / Gold Leads
- ✅ Links to company profile

---

## Proposed Enhancements

### 1. Signal Score Badge
**Priority:** Medium  
**Why:** Score (1-10) is a key metric for prioritization

Current: Not shown  
Proposed: Add small circular score badge (top-right of card)
- Green (7-10), Yellow (4-6), Gray (1-3)
- Only show for scored signals

### 2. Signal Tier Indicator
**Priority:** Low  
**Why:** Tier 1-6 taxonomy maps to actionability

Options:
- Subtle border color by tier (Tier 1 = gold border, Tier 2-3 = standard)
- Or just rely on signal_type badge (already visual)

**Recommendation:** Skip for now — signal_type is enough visual info

### 3. Multi-Signal Company Indicator
**Priority:** Medium  
**Why:** Some companies have 3-4 signals; show "2 more signals" count

Implementation:
- Query signals per company
- If company has multiple signals, show "+2 more" link on card
- Clicking goes to company profile's signals section

### 4. Source Link
**Priority:** Low  
**Why:** Verify signal source without clicking through

Implementation:
- Small external link icon on card
- Opens `source_url` in new tab
- Only show if source_url exists

### 5. Messaging Hook Preview
**Priority:** High ⭐  
**Why:** Messaging hook is the killer feature — surface it earlier

Current: Only visible on company profile  
Proposed: Show truncated messaging hook on card (1-2 lines)
- Example: *"Saw you're working with JLL on site selection..."*
- Italicized, below signal title

### 6. Time-Based Freshness
**Priority:** Medium  
**Why:** Help users prioritize recent signals

Implementation:
- "Today", "Yesterday", "3 days ago", etc. instead of full date for recent signals
- Full date for older signals (>7 days)

---

## Signal Type Badge Colors

| Type | Badge Style | Example |
|------|-------------|---------|
| `site_search` | 🔥 GOLD LEAD (red bg, white text) | Current |
| `expansion_announcement` | Orange outline | "Expansion" |
| `new_facility` | Blue outline | "New Facility" |
| `funding_round` | Green outline | "Funding" |
| `chips_award` | Purple outline | "CHIPS Award" |
| `contract_award` | Teal outline | "Contract" |
| `earnings_signal` | Gray outline | "Earnings" |
| `facility_opening` | Blue outline | "Opening" |

---

## Filters (Future)

### Phase 1 (Current)
- All Signals
- Gold Leads only

### Phase 2 (Proposed)
- By Industry (dropdown)
- By Signal Type (multi-select)
- By Date Range
- "Has Messaging Hook" filter

---

## Company Profile Signal Section

The company profile page should have a "Signals" tab/section showing:
- All signals for that company (sorted by date)
- Signal timeline visualization
- Ability to mark signals as "reviewed" or "stale"

---

## Implementation Order

1. ⭐ **Messaging Hook Preview** — highest value, low effort
2. **Signal Score Badge** — adds visual priority
3. **Multi-Signal Indicator** — helps discovery
4. **Time-Based Freshness** — polish
5. **Source Link** — convenience

---

## Questions for Craig

1. Messaging hook on card — full sentence or just first phrase?
2. Want score visible on cards, or keep it subtle?
3. Filter by industry/segment — priority?
4. Company profile signals section — next sprint?

---

*Let's discuss priorities before building.*
