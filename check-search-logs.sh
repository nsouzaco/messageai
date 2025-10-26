#!/bin/bash
echo "🔍 Checking semantic search logs..."
echo ""
firebase functions:log --lines 50 | grep -E "(semanticSearch|searchMessages|Pinecone query)" -i -A 3 -B 2
echo ""
echo "If no search logs appear, the function may not be getting called."

