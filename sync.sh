#!/bin/bash

# Detect which machine we're on
if [ -d "/Users/casegoods01/Documents/almirah/Field Notes" ]; then
    VAULT="/Users/casegoods01/Documents/almirah/Field Notes"
elif [ -d "/Users/PREDATOR/Documents/almirah/Field Notes" ]; then
    VAULT="/Users/PREDATOR/Documents/almirah/Field Notes"
else
    echo "Could not find Field Notes vault. Please check the path."
    exit 1
fi

echo "Syncing from $VAULT..."
cp -r "$VAULT"/* content/
git add -A
git stash
echo "Pulling latest changes..."
git pull --rebase
git stash pop
echo "Pushing to GitHub..."
git add -A
git commit -m "field notes sync: $(date '+%Y-%m-%d %H:%M')"
git push
echo "Done! Site will update in 2-3 minutes."