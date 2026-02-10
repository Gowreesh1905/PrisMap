# Integration Testing

## Overview
This document tracks the progress, protocols, and results of the integration testing phase for the PrisMap application.

## Tool Selection: Vitest vs Playwright
We chose **Vitest** for this phase of testing for the following reasons:
- **Scope:** Our goal was **Integration Testing**, which focuses on verifying that individual parts of the application (components, hooks, logic) work together correctly.
- **Speed:** Vitest runs in a simulated environment (`jsdom`) which is significantly faster than launching real browsers.
- **Component Access:** Vitest (with React Testing Library) allows us to inspect React component state, props, and internal logic directly, which is difficult with E2E tools.

**Why not Playwright?**
- **Playwright** is an **End-to-End (E2E)** testing tool. It controls a real web browser (Chrome, Firefox, etc.) and tests the application exactly as a user sees it.
- **Trade-off:** While Playwright is better for visual checking (like Canvas drawing) and full browser behavior, it is slower to execution and requires the full application to be built and running.
- **Future Recommendation:** For the "Canvas" feature specifically, Playwright is the recommended tool for future E2E testing because `jsdom` cannot replicate the HTML5 Canvas API.

## Protocol
To run the integration tests with the UI dashboard:
```bash
npm run test:ui
# or
npx vitest --ui
```
To run tests once in the terminal:
```bash
npx vitest run
```

## Phase 1: Authentication & Navigation
- **Objective:** Verify core login and navigation flows.
- **Components:** `LoginPage`, `Navbar`
- **Results:**
    - `src/app/__tests__/page.test.jsx`: **PASSED** (Login flow, Error handling)
    - `src/components/__tests__/Navbar.test.jsx`: **PASSED** (User profile, Navigation, Logout)

## Phase 2: Full Scale Expansion (Current)
- **Objective:** Expand coverage to Dashboard, Canvas, and Settings pages.
- **Status:** **Partially Completed**
- **Test Files Created:**
    - `src/app/dashboard/__tests__/page.test.jsx`
    - `src/app/canvas/__tests__/page.test.jsx`
    - `src/app/__tests__/routes.test.jsx`

### Test Results
Run Command: `npx vitest run`

| Component | Status | Details |
| :--- | :--- | :--- |
| **Settings Page** | ✅ PASSED | Profile rendering, Data loading, Danger zone visibility. |
| **Shortcuts Page** | ✅ PASSED | List rendering, Static content check. |
| **Dashboard** | ⚠️ PARTIAL | • **Passed:** Project list rendering, Empty state check.<br>• **Skipped:** Auth redirect & Navigation (Due to simulated environment limitations). |
| **Canvas** | ⚠️ SKIPPED | • **Skipped:** Visual drawing & Canvas interaction.<br>• **Reason:** `jsdom` environment does not support HTML Canvas API required by `react-konva`. Comparison with "Real Browser" (E2E) testing is recommended for these features. |

## Known Limitations
1.  **Canvas API:** The `jsdom` environment cannot render HTML5 Canvas elements. Tests involving visual drawing (Konva) are skipped and require manual verification or a browser-based runner (e.g., Playwright).
2.  **Auth Redirects:** Complex `useEffect` driven redirects based on mock auth state can be flaky in the test environment due to timing issues. These are verified manually.

## Next Steps
- Manual verification of Canvas drawing tools.
- Consider setting up Playwright for E2E testing of the Canvas component in the future.
