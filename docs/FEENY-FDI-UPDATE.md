# FDI Origin Update Instructions for Feeny

## Summary
Waldo identified **116 FDI projects** totaling **$265B** by analyzing notes and company names. The `fdi_origin` column is currently empty — this update will populate it.

## Quick Stats (after update)
| Country | Projects | Capex |
|---------|----------|-------|
| Taiwan | 7 | $166B |
| South Korea | 15 | $60B |
| Netherlands | 5 | $13B |
| Japan | 17 | $6.3B |
| Switzerland | 13 | $5.8B |
| Germany | 16 | $2.0B |
| China | 3 | $1.5B |
| France | 11 | $1.4B |
| United Kingdom | 7 | $1.3B |
| Italy | 8 | $0.8B |
| Canada | 8 | $0.3B |
| Sweden | 2 | $0.1B |
| India | 2 | $0.1B |
| Australia | 2 | $0.0B |

## Instructions

### Option 1: Manual Update (Quick)
Add a column `FDI_Origin` to master-project-tracker.csv and fill in based on the mapping below.

### Option 2: Use This CSV
Save this as `fdi-mappings.csv` and VLOOKUP/merge into your master tracker:

```csv
Company,FDI_Origin
TSMC,Taiwan
Celltrion,South Korea
Samsung Electronics,South Korea
Stellantis,Netherlands
Amkor Technology,South Korea
Korea Zinc,South Korea
Hyundai Steel,South Korea
Samsung,South Korea
Panasonic,Japan
Roche,Switzerland
Siemens Energy,Germany
Vulcan Elements,China
Novartis,Switzerland
Genentech,Switzerland
Foxconn,Taiwan
Roche Diagnostics,Switzerland
Prysmian/Encore Wire,Italy
GE Appliances,China
Hitachi Energy,Japan
AstraZeneca,United Kingdom
Diageo,United Kingdom
Bridor USA,France
Bridor,France
Reju,France
Nestle Purina,Switzerland
Samsung Biologics,South Korea
Isuzu North America,Japan
NSG Group/Pilkington,Japan
SPC Group,South Korea
Toyota,Japan
Komatsu,Japan
Sofidel,Italy
AbbVie,Switzerland
GF Casting Solutions,Switzerland
Evonik,Germany
Hyosung HICO,South Korea
MGC Pure Chemicals,Japan
Formosa Plastics,Taiwan
Eurofins Lancaster Labs,France
KPPC Advanced Chemicals,Taiwan
MTU Aero Engines,Germany
Archer Aviation,Netherlands
Mitsubishi Electric Power Products,Japan
Inventec,Taiwan
Cyclic Materials,Canada
Eco King Solutions (Kingsun),China
DAS North America,South Korea
SSAB,Sweden
Rolls-Royce,United Kingdom
Constellium,France
ContiTech USA,Germany
Butting USA,Germany
Hwashin America,South Korea
KoMiCo,South Korea
Scotiabank,Canada
Gattefossé,France
Shinsung ST USA,South Korea
Syngene International,India
Oerlikon,Switzerland
Nidec,Japan
Axium Packaging,Canada
Georg Utz,Switzerland
Vallourec,France
Samkwang,South Korea
PEGATRON,Taiwan
KettenWulf,Germany
Dongwon Autopart Technology,South Korea
Daikin America,Japan
Wieland Chase,Germany
Wieland Group,Germany
Cancoil USA,Canada
Mercedes-Benz USA LLC Vance,Germany
BAE Systems,United Kingdom
D-Wave Quantum,Canada
Pacific Manufacturing,Japan
SencorpWhite,United Kingdom
Imasen Bucyrus Technology,Japan
Aquatic Leisure Technologies,Australia
Aqua Technics (aka Aquatic Leisure) Opp,Australia
RUPES USA,Italy
Westrafo America,Italy
Volkswagen,Germany
CITEL America,France
Huwell US,Italy
Socomec,France
La Linea Verde,Italy
CMP Advanced Mechanical Solutions,Canada
Salvagnini America,Italy
Oldcastle Lawn & Garden Abbeville,Switzerland
Becker Mining,Germany
KADIA USA,Germany
Microtex Composites,Italy
GEALAN,Germany
GKN Aerospace,United Kingdom
Savencia Cheese USA,France
L&T Technology,India
Immatics,Germany
Toyota Tsusho,Japan
```

## Key FDI Companies to Double-Check

These are the mega-deals — verify the origin is correct:

| Company | Capex | Origin | Notes |
|---------|-------|--------|-------|
| TSMC | $165B | Taiwan | Taiwanese foundry |
| Celltrion | $18B | South Korea | Korean biopharma |
| Samsung Electronics | $17B | South Korea | Korean conglomerate |
| Stellantis | $11.9B | Netherlands | HQ in Amsterdam (Fiat/Chrysler/Peugeot merger) |
| Amkor Technology | $7B | South Korea | Korean semiconductor packaging |
| Korea Zinc | $6.6B | South Korea | Korean metals |
| Hyundai Steel | $5.8B | South Korea | Korean steel |

## After Update

Re-upload `master-project-tracker.csv` to Google Drive and ping Waldo to reimport. The Project Intelligence page will then show FDI source country breakdowns.

---

Questions? Ping the team in #data-drops.
