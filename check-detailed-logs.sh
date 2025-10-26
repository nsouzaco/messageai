#!/bin/bash
echo "🔍 Checking detailed decision detection logs..."
echo ""
firebase functions:log --lines 40 | grep -E "(autoDetectDecisions|Decision|Messages fetched|Fetching messages)" -A 2 -B 1

