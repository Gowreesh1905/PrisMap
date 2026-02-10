# PowerShell script to run integration tests using the UI
# This script utilizes Vitest UI for an interactive testing experience.

Write-Output "Checking dependencies..."

# Check if node_modules exists, install if missing
if (-not (Test-Path "node_modules")) {
    Write-Output "Installing missing dependencies..."
    npm install
}

Write-Output "Starting Integration Tests with UI..."
npm run test:ui
