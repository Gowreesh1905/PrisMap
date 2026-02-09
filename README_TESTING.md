Integration Testing with UI

card
This project uses **Vitest UI** for running and visualizing tests.

## Running Tests

### Option 1: Automation Script (Recommended)

#### On Windows (PowerShell)
Execute the PowerShell script:

```powershell
.\integration_tests.ps1
```

#### On Mac/Linux/Bash
Execute the Bash script:

```bash
./integration_tests.sh
```

### Option 2: Direct Command

You can also run the npm command directly:

```bash
npm run test:ui
```

## What this does

1.  Checks if `node_modules` are installed and installs them if missing.
2.  Starts the Vitest UI server.
3.  Opens a browser window where you can view test results, logs, and interact with the component tests.

## Test Location

- The tests are located in: `src/app/__tests__` and other `__tests__` directories.
- The script targets all files ending in `.test.jsx`, `.test.js`, etc.
