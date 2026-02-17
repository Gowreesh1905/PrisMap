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
## Troubleshooting
 
 ### Common Issues
 
 1. **Unexpected "<<" (Syntax Error)**:
    - **Reason**: This usually means there are unresolved git merge conflict markers in a test file.
    - **Fix**: Open the file mentioned in the error, find the `<<<<<<<`, `=======`, and `>>>>>>>` blocks, and resolve the conflict manually.
 
 2. **Worker OOM (Out of Memory)**:
    - **Reason**: Complex components (like the Infinite Canvas) can exceed the default memory limit of the test runner.
    - **Fix**: Run tests with increased memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run test:run`.
 
 3. **TDZ (Temporal Dead Zone)**:
    - **Reason**: Variables or functions used in `useEffect` or other hooks before they are defined.
    - **Fix**: Use `useCallback` to hoist function definitions or move the definition above the hook that references it.
