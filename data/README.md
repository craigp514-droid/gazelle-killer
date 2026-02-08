# Data Directory

Source of truth for raw company and signal data.

## Structure

```
data/
├── companies/      # Canonical company CSVs by industry
├── signals/        # Signal data
├── schemas/        # Data schemas and documentation
└── archive/        # Deprecated datasets (kept for history)
```

## Naming Convention

- Files: `{industry-slug}.csv` (e.g., `space-aerospace.csv`)
- Header comment: `# Source: {bot} | Synced: {date} | Companies: {count}`

## Workflow

1. Todd/research drops CSV in Google Drive collaboration folder
2. Waldo syncs to `/data/companies/`
3. Waldo commits to git (version history)
4. Waldo runs import script to load into Supabase

## Version Control

Git tracks all changes. No need for FINAL/v2/v3 suffixes.

To see history: `git log --oneline data/companies/{file}.csv`
To restore: `git checkout {commit} data/companies/{file}.csv`
