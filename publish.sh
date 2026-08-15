#!/bin/bash
set -euo pipefail

# Move to the repo directory (adjust to your actual repo path)
cd "$HOME/notes"

# Sync field notes into content/
cp -r "$HOME/Documents/almirah/Field Notes/"* content/

# Stage everything
git add -A

# Only commit + push if there are actual changes
if git diff --cached --quiet; then
  echo "No changes to sync."
else
  git commit -m "field notes sync: $(date '+%Y-%m-%d %H:%M')"
  git push origin main
  echo "Done! Site updates in 2-3 minutes."
fi
