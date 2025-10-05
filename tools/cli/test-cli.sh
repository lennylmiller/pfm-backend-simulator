#!/bin/bash

# Quick test script to verify CLI starts without errors
# This doesn't test full functionality, just that it initializes

echo "Testing CLI startup..."
echo -e "n\n" | npm run cli 2>&1 | grep -q "PFM Backend Simulator"

if [ $? -eq 0 ]; then
    echo "✅ CLI starts successfully"
    exit 0
else
    echo "❌ CLI failed to start"
    exit 1
fi
