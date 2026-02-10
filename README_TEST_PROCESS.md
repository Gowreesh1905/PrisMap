# Integration Testing Process Documentation

This document outlines the systematic approach used to implement integration tests for the PrisMap application, following the standard software testing life cycle.

## 1. Identify Components
**Action:** Analyzed the `src/app` directory to identify core feature modules requiring coverage.
**Identified Components:**
-   **Authentication:** `LoginPage` (Entry point)
-   **Navigation:** `Navbar` (Global navigation)
-   **Dashboard:** `DashboardPage` (Project listing, User profile check)
-   **Core Editor:** `CanvasPage` (Drawing area, Toolbar, Layers)
-   **User Preferences:** `SettingsPage`, `ShortcutsPage`

## 2. Determine Objectives
**Action:** Defined the goals for Integration Testing versus Unit or E2E testing.
**Objectives:**
-   Verify that the **Router** correctly handles navigation between pages.
-   Verify that **Firebase Authentication** state changes are reflected in the UI (e.g., Redirects).
-   Verify that **Data Fetching** (Firestore snapshots) correctly renders lists (Projects, Layers).
-   **Constraint:** Use `jsdom` (Vitest) for fast execution, acknowledging it cannot render actual Canvas pixels.

## 3. Define Test Data
**Action:** Created mock data structures to simulate backend responses without hitting the live Firebase database.
**Data Sets:**
-   **Mock User:** `{ uid: 'test-uid', email: 'test@example.com' }`
-   **Mock Firestore Documents:**
    -   *Projects List:* Array of objects with `id`, `title`, `updatedAt`.
    -   *Canvas Data:* JSON structure with `elements` (lines, rects) and `metadata`.
    -   *User Profile:* Object with `bio`, `jobTitle`, `phoneNumber`.

## 4. Design Test Cases
**Action:** Outlined specific scenarios to verify for each component.
**Scenarios:**
-   **Dashboard:**
    -   *Happy Path:* User logs in -> Sees list of projects.
    -   *Edge Case:* User has no projects -> Sees "Empty Workspace" message.
    -   *Security:* Unauthenticated user accesses route -> Redirects to Login.
-   **Canvas:**
    -   *State:* Canvas loads with correct title.
    -   *Interaction:* "Save" button triggers Firestore update (Mocked).
-   **Settings:**
    -   *Render:* Inputs pre-filled with user profile data.

## 5. Develop Test Scripts
**Action:** Wrote the actual test code using **Vitest** and **React Testing Library**.
**Implementation Details:**
-   **Location:** `src/app/**/__tests__/page.test.jsx`
-   **Mocking:**
    -   Used `vi.mock('firebase/auth')` to control login state.
    -   Used `vi.mock('next/navigation')` to spy on `router.push`.
    -   Used `Object.defineProperty` to mock global `crypto.randomUUID`.

## 6. Set Up Environment
**Action:** Configured the test runner and ecosystem.
**Configuration:**
-   **Runner:** Vitest (compatible with Vite/Next.js).
-   **Environment:** `jsdom` (simulates a browser DOM in Node.js).
-   **Configuration File:** `vitest.config.mjs` ensuring all `src/` aliases and setup files are loaded.

## 7. Execute Tests
**Action:** Ran the test suites to validate implementation.
**Commands Used:**
-   `npm run test` (Headless run)
-   `npm run test:ui` (Interactive UI mode)
**Process:**
-   Initially encountered failures in Dashboard (Auth redirects) and Canvas (Konva mocking).
-   Iteratively refined mocks (e.g., adding `act()` wrappers, improving `react-konva` mocks) to resolve errors.

## 8. Evaluate Results
**Action:** Analyzed pass/fail rates to determine release readiness.
**Findings:**
-   ✅ **Pass:** Route navigation, Static rendering, Data loading logic.
-   ⚠️ **Skip:** Visual Canvas drawing (Requires E2E tool), Auth Redirect timing (Flaky in `jsdom`).
-   **Conclusion:** The application logic is verified. Visual correctness of the Canvas editor requires a separate E2E testing phase (recommended: Playwright).
