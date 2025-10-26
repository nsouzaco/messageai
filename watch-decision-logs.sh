#!/bin/bash
# Watch decision detection in real-time

echo "🔍 Watching for decision detection (press Ctrl+C to stop)..."
echo ""
echo "Send a decision message now, then watch this screen!"
echo "================================================"
echo ""

# Watch logs in real-time
firebase functions:log --lines 5 | grep -E "(autoDetectDecisions|Decision)" -A 2 -B 1

echo ""
echo "Waiting for new logs..."
sleep 5

firebase functions:log --lines 20 | grep -E "(autoDetectDecisions|Decision)" -A 2 -B 1

