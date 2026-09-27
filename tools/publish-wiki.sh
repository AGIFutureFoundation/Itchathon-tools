#!/usr/bin/env bash
# Publishes docs/wiki/*.md to the GitHub wiki (a separate git repo). Needs push access.
set -euo pipefail
cd "$(dirname "$0")/.."
W=$(mktemp -d)
git clone -q https://github.com/AGIFutureFoundation/Itchathon-tools.wiki.git "$W" 2>/dev/null || git init -q "$W"
cp docs/wiki/*.md "$W"/
cd "$W" && git add -A && git commit -qm "Wiki: Sapient.X docs" && git push -q https://github.com/AGIFutureFoundation/Itchathon-tools.wiki.git HEAD:master
echo "wiki published"
