# I-TEST_DOCUMENTATION.md — Integration Testing Documentation

**Project:** PrisMap  
**Version:** 0.1.0  
**Last Updated:** February 10, 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Testing Architecture](#2-testing-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Mock Strategy](#4-mock-strategy)
5. [Test File Structure](#5-test-file-structure)
6. [Test Case Catalog](#6-test-case-catalog)
7. [How to Run Tests](#7-how-to-run-tests)
8. [Writing New Tests](#8-writing-new-tests)
9. [Troubleshooting](#9-troubleshooting)
10. [Coverage Analysis](#10-coverage-analysis)

---

## 1. Introduction

### Purpose

This document provides comprehensive documentation for the **integration testing** infrastructure of the PrisMap application. Integration tests verify that multiple modules — Firebase authentication, Firestore data layer, Next.js routing, React components, and UI interactions — work correctly **together** in realistic user workflows.

### Scope

| Scope | Description |
|---|---|
| **In scope** | Component-level integration tests using Vitest + React Testing Library |
| **In scope** | Firebase Auth/Firestore mock-based testing |
| **In scope** | Navigation flow verification |
| **Out of scope** | End-to-end browser testing (Playwright/Selenium) |
| **Out of scope** | Performance/load testing |

### What Makes These Integration Tests (Not Unit Tests)

| Aspect | Unit Test | Our Integration Tests |
|---|---|---|
| Scope | Single function in isolation | Full page with all child components |
| Firebase | Not involved | Tests auth flow → page rendering → Firestore display |
| Navigation | Not involved | Tests routing between pages (login → dashboard → canvas) |
| User Workflows | Not involved | Tests end-to-end flows: edit → fill → save → feedback |
| Dependencies | All mocked | Multiple real modules integrated, external services mocked |

---

## 2. Testing Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Testing Layers                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │  E2E Tests (Playwright — Not Yet Implemented)   │   │
│   │  Real browser, real server, full user journey   │   │
│   └─────────────────────────────────────────────────┘   │
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │  ★ Integration Tests (Vitest + RTL) ← WE ARE   │   │
│   │  Full pages, mocked services, user workflows    │   │
│   └─────────────────────────────────────────────────┘   │
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │  Unit Tests (Vitest)                            │   │
│   │  Individual functions, pure logic               │   │
│   └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow in Integration Tests

```
Test File
   │
   ├── Mock Firebase Auth (onAuthStateChanged, signOut, signInWithPopup)
   ├── Mock Firestore (getDoc, setDoc, onSnapshot, collection)
   ├── Mock Next.js Navigation (useRouter, useParams, useSearchParams)
   ├── Mock Konva/react-konva (Stage → div, Rect → div, etc.)
   │
   └── render(<PageComponent />)
        │
        ├── Component initializes → calls onAuthStateChanged
        ├── Auth mock fires → component sets user state
        ├── Component fetches data → Firestore mock returns data
        ├── Component renders UI → React Testing Library queries DOM
        │
        └── Test assertions verify:
             ├── Correct elements rendered
             ├── User interactions trigger expected behavior
             ├── Navigation flows work correctly
             └── Data layer integration is correct
```

---

## 3. Technology Stack

| Tool | Version | Purpose |
|---|---|---|
| **Vitest** | ^4.0.18 | Test runner, assertion library, mocking |
| **React Testing Library** | ^16.3.0 | DOM querying, user event simulation |
| **@testing-library/jest-dom** | ^6.6.5 | Custom DOM matchers (toBeInTheDocument, etc.) |
| **happy-dom** | ^20.6.0 | Lightweight browser environment simulation |
| **@vitejs/plugin-react** | ^4.5.3 | JSX transformation in test files |

### Configuration Files

| File | Purpose |
|---|---|
| `vitest.config.mjs` | Test runner configuration, aliases, environment |
| `vitest.setup.jsx` | Global mocks (Firebase, Konva, Next.js navigation) |
| `src/__mocks__/canvas.js` | Canvas API mock for Konva compatibility |

---

## 4. Mock Strategy

### 4.1 Firebase Authentication (`vitest.setup.jsx`)

```javascript
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn((auth, callback) => {
        callback({ uid: 'test-user-id' });
        return () => {};
    }),
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
}));
```

**Override per test file:**
```javascript
onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(null); // Simulate unauthenticated user
    return () => {};
});
```

### 4.2 Firestore (`vitest.setup.jsx`)

```javascript
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ /* mock data */ }),
    }),
    setDoc: vi.fn(),
    collection: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(),
}));
```

**Override per test file** (e.g., Settings page):
```javascript
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, getDoc: vi.fn(), setDoc: vi.fn(), /* ... */ };
});
```

### 4.3 Next.js Navigation (`vitest.setup.jsx`)

```javascript
vi.mock('next/navigation', () => ({
    useParams: vi.fn(),
    useRouter: vi.fn(() => ({
        push: vi.fn(), back: vi.fn(), replace: vi.fn(),
    })),
    useSearchParams: vi.fn(() => ({ get: vi.fn() })),
    usePathname: vi.fn(() => '/'),
}));
```

### 4.4 Konva / react-konva (`vitest.setup.jsx`)

Replaces canvas-dependent Konva components with simple HTML divs:

```javascript
vi.mock('react-konva', () => ({
    Stage: ({ children }) => <div data-testid="stage">{children}</div>,
    Layer: ({ children }) => <div data-testid="layer">{children}</div>,
    Rect: (props) => <div data-testid="rect" {...props} />,
    Circle: (props) => <div data-testid="circle" {...props} />,
    // ... etc.
}));
```

### 4.5 Component Mocking (Per-File)

For pages that import complex child components:
```javascript
vi.mock('@/components/Navbar', () => ({
    default: () => <div data-testid="navbar-mock">Navbar</div>,
}));
```

---

## 5. Test File Structure

### Directory Layout

```
src/
├── __mocks__/
│   └── canvas.js              # Canvas API mock
├── app/
│   ├── page.test.jsx           # Landing page tests
│   ├── canvas/
│   │   ├── page.test.jsx       # Canvas standalone tests (skipped)
│   │   └── [id]/
│   │       └── page.test.jsx   # Canvas editor tests
│   ├── dashboard/
│   │   └── page.test.jsx       # Dashboard tests
│   ├── settings_page/
│   │   └── page.test.jsx       # Settings page tests
│   └── shortcuts/
│       └── page.test.jsx       # Shortcuts page tests
├── components/
│   ├── Navbar.test.jsx         # Navbar component tests
│   └── LayersPanel.test.jsx    # LayersPanel component tests
└── hooks/
    └── useKeyboardShortcuts.test.js  # Hook tests
```

### Naming Conventions

| Convention | Example |
|---|---|
| Test file co-located with source | `page.jsx` → `page.test.jsx` |
| Hook tests use `.test.js` | `useKeyboardShortcuts.test.js` |
| Component tests use `.test.jsx` | `Navbar.test.jsx` |
| Describe block matches component name | `describe('Settings Page Integration Tests', ...)` |

### Test File Template

```javascript
import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Component from './page'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'

describe('Component Integration Tests', () => {
    const mockPush = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue({ push: mockPush });
        onAuthStateChanged.mockImplementation((auth, cb) => {
            cb({ uid: 'test-user-id' });
            return () => {};
        });
    });

    it('test case name', async () => {
        await act(async () => { render(<Component />); });
        expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
});
```

---

## 6. Test Case Catalog

### By Module

| Module | File | Tests | Categories |
|---|---|---|---|
| Login Page | `app/page.test.jsx` | 3 | UI |
| Dashboard | `app/dashboard/page.test.jsx` | 4 | Auth, Data, UI |
| Settings | `app/settings_page/page.test.jsx` | 19 | Auth, Data, UI, Interaction, Nav |
| Shortcuts | `app/shortcuts/page.test.jsx` | 11 | UI, Nav, Accessibility |
| Canvas | `app/canvas/page.test.jsx` | 15 | Auth, UI, Interaction (skipped) |
| Canvas [id] | `app/canvas/[id]/page.test.jsx` | 7 | Data, UI (OOM) |
| Navbar | `components/Navbar.test.jsx` | 5 | UI, Interaction |
| LayersPanel | `components/LayersPanel.test.jsx` | 4 | UI, Interaction |
| Shortcuts Hook | `hooks/useKeyboardShortcuts.test.js` | 8 | Logic, Safety |

### By Category

| Category | Count | Examples |
|---|---|---|
| **UI Rendering** | 28 | Renders headers, sections, buttons, forms |
| **User Interaction** | 15 | Click handlers, form toggling, modal open/close |
| **Authentication** | 5 | Login redirect, auth state handling |
| **Data Layer** | 6 | Firestore read/write, project fetching |
| **Navigation** | 5 | Router.push, router.back, URL params |
| **Logic** | 8 | Key combos, normalization, safety guards |
| **Accessibility** | 2 | aria-labels, keyboard nav |

---

## 7. How to Run Tests

### CLI Commands

| Command | Description |
|---|---|
| `npm run test` | Start Vitest in watch mode |
| `npm run test:run` | Run all tests once (CI mode) with verbose output |
| `npm run test:ui` | Open Vitest UI in browser for interactive testing |
| `npx vitest run <file>` | Run a specific test file |
| `npx vitest run --reporter=verbose` | Run all with detailed output |

### Automation Scripts

**Windows (PowerShell):**
```powershell
.\integration_tests.ps1
```

**Mac/Linux (Bash):**
```bash
./integration_tests.sh
```

### CI/CD Integration

Add to your GitHub Actions workflow:
```yaml
- name: Run Integration Tests
  run: npm run test:run
  env:
    NODE_OPTIONS: --max-old-space-size=4096
```

---

## 8. Writing New Tests

### Step 1: Create the Test File

Place the test file next to the source file:
```
src/app/new_feature/page.jsx      # Source
src/app/new_feature/page.test.jsx  # Test (create this)
```

### Step 2: Import and Setup Mocks

```javascript
import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import NewFeaturePage from './page'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
```

### Step 3: Override Default Mocks if Needed

If your component uses Firestore functions not covered by the global mock:
```javascript
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, newFunction: vi.fn() };
});
```

### Step 4: Write Test Cases

Follow the pattern: **Arrange → Act → Assert**
```javascript
it('shows welcome message for authenticated user', async () => {
    // Arrange: mock is already set in beforeEach
    // Act:
    await act(async () => { render(<NewFeaturePage />); });
    // Assert:
    expect(screen.getByText('Welcome')).toBeInTheDocument();
});
```

### Step 5: Run and Verify

```bash
npx vitest run src/app/new_feature/page.test.jsx
```

---

## 9. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| `Cannot access 'X' before initialization` | Temporal dead zone — function used in `useEffect` deps before definition | Move function definition above the `useEffect`, or use `useCallback` |
| `getByAlt is not a function` | Wrong RTL query method | Use `getByAltText()` instead |
| `Unable to fire a "click" event` | `closest('button')` returned `null` | Use `getAllByRole('button', { name: /text/ })` instead |
| `Worker exited unexpectedly` | V8 heap limit exceeded | Run with `NODE_OPTIONS=--max-old-space-size=4096` |
| `Cannot find dependency 'happy-dom'` | Missing dev dependency | Run `npm install -D happy-dom` |
| `poolOptions deprecated` | Vitest 4 config change | Move `isolate` to top-level `test` config |
| Konva/canvas errors | Native canvas not available in happy-dom | Ensure `react-konva` mock in `vitest.setup.jsx` |
| Firestore mock not returning data | Global mock overridden incorrectly | Use `async (importOriginal)` pattern |
| `Multiple elements found` | Query matches both heading and button text | Use `getByRole('button', { name: /text/ })` for specificity |

### Debugging Tips

1. **Run a single test file:** `npx vitest run src/app/settings_page/page.test.jsx`
2. **See rendered HTML:** Add `screen.debug()` in your test
3. **Use Vitest UI:** `npm run test:ui` for interactive browser-based debugging
4. **Check mock setup:** Ensure `vitest.setup.jsx` mocks match your imports

---

## 10. Coverage Analysis

### What IS Tested

| Area | Coverage | Notes |
|---|---|---|
| Authentication flows | ✅ Full | Login, logout, redirect, auth state |
| Dashboard CRUD | ✅ Full | List, create, empty state |
| Settings profile management | ✅ Full | View, edit, save, character limits |
| Account deletion flow | ✅ Full | Modal, confirmation, cancel |
| Navigation between pages | ✅ Full | Router push, back, URL params |
| Keyboard shortcuts | ✅ Full | Key combos, input safety, normalization |
| UI component interactions | ✅ Full | Click, toggle, search, filter |

### What is NOT Tested (and Why)

| Area | Reason | Recommendation |
|---|---|---|
| Canvas drawing operations | Source code TDZ prevents rendering | Fix source, then unskip tests |
| Canvas editor (with Firestore) | Worker OOM in test env | Use Playwright E2E |
| Real Firebase connections | Tests use mocks by design | Manual QA or staging tests |
| CSS visual rendering | happy-dom doesn't render pixels | Visual regression tools (Percy, Chromatic) |
| Performance under load | Not an integration test concern | Use Lighthouse, k6 |
| Mobile responsiveness | No viewport simulation | Playwright with device emulation |
