# Integration Testing Notes

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

## Phase 1: Authentication & Navigation
- **Objective:** Verify core login and navigation flows.
- **Results:**
    - `src/app/__tests__/page.test.jsx`: **PASSED**
    - `src/components/__tests__/Navbar.test.jsx`: **PASSED**

## Phase 2: Core Features (Dashboard, Settings, Canvas)
- **Objective:** Expand coverage to main application routes.
- **Results:**
    - **Settings Page:** ✅ **PASSED**
    - **Shortcuts Page:** ✅ **PASSED**
    - **Dashboard:** ⚠️ **PARTIAL** (Project list passing; Auth redirect skipped due to mock timing)
    - **Canvas:** ⚠️ **SKIPPED** (Requires real browser/Playwright for visual verification)

## Known Limitations
1.  **Canvas API:** The `jsdom` environment cannot render HTML5 Canvas elements. Visual tests for `react-konva` are skipped.
2.  **Auth Redirects:** specific mock-based auth redirects are best tested in E2E.
