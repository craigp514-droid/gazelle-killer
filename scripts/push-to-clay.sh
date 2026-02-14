#!/bin/bash
# Push companies from clay-queue.csv to Clay webhook for enrichment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
QUEUE_FILE="$PROJECT_DIR/data/clay-queue.csv"
KEY_FILE="$PROJECT_DIR/secrets/clay-api-key.txt"
LOG_FILE="$PROJECT_DIR/memory/clay-push-log.txt"
WEBHOOK_URL="https://api.clay.com/v3/sources/webhook/pull-in-data-from-a-webhook-d4b4e7f3-b6d3-4cc9-8740-ec6e014c1d5c"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Clay API key not found at $KEY_FILE"
    exit 1
fi

# Check if queue file exists
if [ ! -f "$QUEUE_FILE" ]; then
    echo "❌ Queue file not found at $QUEUE_FILE"
    exit 1
fi

API_KEY=$(cat "$KEY_FILE")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "🚀 Starting Clay push at $TIMESTAMP"
echo "---"

# Create log dir if needed
mkdir -p "$(dirname "$LOG_FILE")"

# Count total (minus header)
TOTAL=$(tail -n +2 "$QUEUE_FILE" | wc -l | tr -d ' ')
echo "📦 Found $TOTAL companies to push"

if [ "$TOTAL" -eq 0 ]; then
    echo "Queue is empty. Nothing to push."
    exit 0
fi

SUCCESS=0
FAILED=0

# Read CSV (skip header) and push each company
tail -n +2 "$QUEUE_FILE" | while IFS=, read -r company website; do
    # Remove quotes if present
    company=$(echo "$company" | tr -d '"')
    website=$(echo "$website" | tr -d '"')
    
    if [ -z "$company" ] || [ -z "$website" ]; then
        continue
    fi
    
    echo "→ Pushing: $company"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "x-clay-webhook-auth: $API_KEY" \
        -d "{\"Company Name\": \"$company\", \"Website\": \"$website\"}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        echo "  ✓ Success ($HTTP_CODE)"
        SUCCESS=$((SUCCESS + 1))
        echo "$TIMESTAMP | $company | $website | SUCCESS" >> "$LOG_FILE"
    else
        echo "  ✗ Failed ($HTTP_CODE)"
        FAILED=$((FAILED + 1))
        echo "$TIMESTAMP | $company | $website | FAILED ($HTTP_CODE)" >> "$LOG_FILE"
    fi
done

echo "---"
echo "✅ Pushed: $SUCCESS"
echo "❌ Failed: $FAILED"

# Clear queue after successful push
if [ "$FAILED" -eq 0 ]; then
    echo "Company Name,Website" > "$QUEUE_FILE"
    echo "📭 Queue cleared"
fi
