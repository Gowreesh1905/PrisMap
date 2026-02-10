#!/bin/bash

# Script to run integration tests using the UI
# This script utilizes Vitest UI for an interactive testing experience.

echo "Checking dependencies..."

# Check if node_modules exists, install if missing
if [ ! -d "node_modules" ]; then
    echo "Installing missing dependencies..."
    npm install
fi

echo "Starting Integration Tests with UI..."
npm run test:ui
