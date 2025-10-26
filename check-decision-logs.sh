#!/bin/bash
# Script to check decision detection logs

echo "🔍 Checking decision detection logs..."
echo ""

firebase functions:log --lines 30 | grep -E "(Decision|decision|autoDetect)" -A 2 -B 2

echo ""
echo "✅ Done! Look for lines containing 'Decision AI response parsed' to see what the AI detected."

