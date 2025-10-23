#!/bin/bash
# Development server startup script
# Always runs on port 3000

echo "🧹 Clearing port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "🚀 Starting dev server on port 3000..."
npm run dev

