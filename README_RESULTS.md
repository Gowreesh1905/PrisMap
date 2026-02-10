# Test Results Summary

## Overview
This document summarizes the results of the latest integration test run and provides detailed explanations for any failures encountered.

## Failing Tests

### 1. `src/app/canvas/__tests__/page.test.jsx` (Canvas Page)
*   **Error:** `ReferenceError: Cannot access 'deleteSelected' before initialization`
*   **Location:** `src/app/canvas/page.jsx:203:33` (in `useEffect` dependencies)
*   **Cause:** The `useEffect` hook for keyboard shortcuts (lines 104-203) references `deleteSelected` in its dependency array. However, `deleteSelected` is defined as a `const` function *later* in the component (line 442). In JavaScript, `const` variables are not hoisted, so accessing them before their declaration throws a ReferenceError during the render phase.
*   **Solution:** Move the `useEffect` hook *after* the definition of `deleteSelected` (and `undo`/`redo`), or change `deleteSelected` to use `useCallback` and define it before the effect.

### 2. `src/app/__tests__/routes.test.jsx` (Shortcuts Page)
*   **Error:** `TestingLibraryElementError: Found multiple elements with the text: Ctrl`
*   **Location:** `src/app/__tests__/routes.test.jsx:78:23`
    ```javascript
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    ```
*   **Cause:** The test uses `getByText('Ctrl')` which expects exactly one element with that text. However, the Shortcuts page likely renders multiple "Ctrl" keys (one for each shortcut like Ctrl+Z, Ctrl+C, etc.), causing the query to fail because it finds multiple matches.
*   **Solution:** Change `getByText` to `getAllByText` to assert that *at least one* exists, or use a more specific query (e.g., `getByText('Ctrl', { selector: 'kbd' })`) if testing for a specific instance.

## Passing Tests
*   `src/app/dashboard/__tests__/page.test.jsx`
*   `src/app/__tests__/page.test.jsx`
*   `src/components/__tests__/Navbar.test.jsx`

## Skipped Tests (As Expected)
*   **Canvas visual tests:** Skipped due to `jsdom` limitations with HTML5 Canvas API.

---
**Summary:**
*   **Total Tests:** 23
*   **Failed:** 5
*   **Passed:** 11
*   **Skipped:** 7
