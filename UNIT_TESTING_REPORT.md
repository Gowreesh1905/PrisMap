# Unit Test Documentation

**Project Name:** PrisMap
**Module:** Canvas Editor, UI Components & User Management
**Version:** 1.0
**Standard:** IEEE 829

---

## 1. Module Overview

PrisMap is an infinite collaborative canvas application built with Next.js, React, Konva, and Firebase. The application consists of the following core modules:

| Module | File | Responsibility |
| :--- | :--- | :--- |
| Authentication | `src/app/page.jsx` | Google OAuth login via Firebase |
| Dashboard | `src/app/dashboard/page.jsx` | Project listing, creation, auth guard |
| Canvas Editor | `src/app/canvas/[id]/page.jsx` | Drawing, shapes, zoom, pan, history, persistence |
| Navbar | `src/components/Navbar.jsx` | Theme toggle, search, logout |
| LayersPanel | `src/components/LayersPanel.jsx` | Layer visibility, lock, reorder |
| Settings | `src/app/settings_page/page.jsx` | Profile update, account deletion |
| Shortcuts | `src/app/shortcuts/page.jsx` | Keyboard shortcut reference |
| Keyboard Hook | `src/hooks/useKeyboardShortcuts.js` | Reusable shortcut handler |
| Firebase Config | `src/lib/firebase.js` | Firebase initialization |

**Test Environment:** Vitest + React Testing Library | Firebase Firestore & Auth | happy-dom | Node.js 18.x | macOS

---

## 2. Authentication Tests (LoginPage)

### 2.1 Login Page Rendering

Users must see the PrisMap title, tagline, and Google sign-in button on the landing page.

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-AUTH-01 | renders the PrisMap title and slogan | Load page | "PrisMap" and "Your infinite collaborative space" visible | ✅ Pass |
| TC-AUTH-02 | renders the Sign in with Google button | Load page | "Sign in with Google" button visible | ✅ Pass |

### 2.2 Login Session & Redirect

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-AUTH-03 | calls signInWithPopup and redirects to dashboard | Click sign-in button | Loading state shown, `signInWithPopup` called, redirect to `/dashboard` | ✅ Pass |

---

## 3. Dashboard Tests

### 3.1 Authentication Guard

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-DASH-01 | redirects to login if user is not authenticated | No user session | `router.push('/')` called | ✅ Pass |

### 3.2 Project Listing (Firestore)

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-DASH-02 | renders the dashboard with projects | Firestore returns 2 projects | "My Canvases", "Project 1", "Project 2", "2 Total Projects" visible | ✅ Pass |
| TC-DASH-03 | shows empty state when no projects exist | Firestore returns empty | "Your workspace is empty" visible | ✅ Pass |

### 3.3 Project Creation

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-DASH-04 | navigates to new canvas on "New Project" click | Click "New Project" | `router.push('/canvas/<uuid>')` called | ✅ Pass |

---

## 4. Navbar Component Tests

### 4.1 User Profile Rendering

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-NAV-01 | renders user profile image | User with photoURL | Avatar `<img>` with correct `src` in DOM | ✅ Pass |

### 4.2 Theme Management

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-NAV-02 | toggles theme between light and dark | Click theme button twice | `dark` class added then removed from `<html>` | ✅ Pass |

### 4.3 Search Functionality

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-NAV-03 | opens search modal on button click | Click search icon | Search input visible | ✅ Pass |
| TC-NAV-04 | filters projects in search | Type "Alpha" | "Alpha Project" shown, "Beta Project" hidden | ✅ Pass |

### 4.4 Logout

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-NAV-05 | calls signOut and redirects on logout click | Click logout button | `signOut()` called, redirect to `/` | ✅ Pass |

---

## 5. LayersPanel Component Tests

### 5.1 Layer Rendering

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-LYR-01 | renders list of layers | 2 elements (rectangle, text) | "Rectangle" and "Sample Text" visible | ✅ Pass |

### 5.2 Layer Controls

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-LYR-02 | handles visibility toggle | Click show/hide button | `onToggleVisibility('2')` called | ✅ Pass |
| TC-LYR-03 | handles locking toggle | Click lock/unlock button | `onToggleLock('2')` called | ✅ Pass |
| TC-LYR-04 | handles layer reordering | Click "Move Up" button | `onMoveUp('2')` called | ✅ Pass |

---

## 6. Canvas Page Tests (Core Module)

The CanvasPage is the primary editor. It uses Konva for rendering, which depends on native `<canvas>`. Tests are written but encounter environment limitations.

### 6.1 Function: handleMouseDown

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-CVS-01 | should start drawing a rectangle when tool is rectangle | Select Rectangle tool, mouseDown on stage | Drawing state initiated | ⚠️ Manual |
| TC-CVS-02 | should select an element when tool is select | Click on existing rectangle | Transformer visible | ⚠️ Manual |

### 6.2 Function: handleMouseMove

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-CVS-03 | should update shape dimensions during drawing | mouseDown + mouseMove on stage | Shape dimensions update in real-time | ⚠️ Manual |

### 6.3 Function: handleMouseUp

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-CVS-04 | should finalize the shape and add to elements | Complete draw cycle (down → move → up) | Rectangle element added to canvas | ⚠️ Manual |

### 6.4 Function: undo / redo

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-CVS-05 | should revert changes on undo and restore on redo | Draw → Undo → Redo | Element removed on undo, restored on redo | ⚠️ Manual |

### 6.5 Function: deleteSelected

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-CVS-06 | should remove the selected element | Select element, press Delete | Element removed from canvas | ⚠️ Manual |

### 6.6 Function: saveCanvas

| Test ID | Test Case | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| TC-CVS-07 | should save to Firestore | Click Save button | `setDoc()` called with canvas data | ⚠️ Manual |

**Canvas Note:** All 7 canvas tests are written in `page.test.jsx` but the Vitest worker crashes due to native `canvas` module dependency in Konva. These were verified manually in-browser and confirmed working.

---

## 7. Traceability Matrix

| Requirement | Test IDs | Module | Status |
| :--- | :--- | :--- | :--- |
| User can sign in with Google | TC-AUTH-01, TC-AUTH-02, TC-AUTH-03 | LoginPage | ✅ |
| Unauthenticated users are redirected | TC-DASH-01 | Dashboard | ✅ |
| User can view their projects | TC-DASH-02, TC-DASH-03 | Dashboard | ✅ |
| User can create a new project | TC-DASH-04 | Dashboard | ✅ |
| User profile is displayed in navbar | TC-NAV-01 | Navbar | ✅ |
| User can toggle dark/light theme | TC-NAV-02 | Navbar | ✅ |
| User can search projects | TC-NAV-03, TC-NAV-04 | Navbar | ✅ |
| User can logout | TC-NAV-05 | Navbar | ✅ |
| Layers are displayed and controllable | TC-LYR-01 to TC-LYR-04 | LayersPanel | ✅ |
| User can draw shapes on canvas | TC-CVS-01 to TC-CVS-04 | CanvasPage | ⚠️ Manual |
| User can undo/redo actions | TC-CVS-05 | CanvasPage | ⚠️ Manual |
| User can delete selected elements | TC-CVS-06 | CanvasPage | ⚠️ Manual |
| Canvas data is persisted to Firestore | TC-CVS-07 | CanvasPage | ⚠️ Manual |

---

## 8. Test Summary

| Metric | Value |
| :--- | :--- |
| Total Test Cases | 23 |
| Automated Passed | 16 |
| Manual Verified | 7 |
| Failed | 0 |
| Test Files | 5 |
| Pass Rate | 100% (16 auto + 7 manual) |

---

## 9. Terminal Execution Log

```
> npx vitest run --reporter=verbose

 RUN  v4.0.18 /Users/priya/Desktop/PrisMap-main

 ✓ src/components/LayersPanel.test.jsx (4)
   ✓ LayersPanel (4)
     ✓ renders list of layers                            20ms
     ✓ handles visibility toggle                          6ms
     ✓ handles locking toggle                             4ms
     ✓ handles layer reordering                           5ms

 ✓ src/components/Navbar.test.jsx (5)
   ✓ Navbar Interaction Tests (5)
     ✓ renders user profile image                        20ms
     ✓ toggles theme between light and dark               9ms
     ✓ opens search modal on button click                 8ms
     ✓ filters projects in search                        59ms
     ✓ calls signOut and redirects on logout click       56ms

 ✓ src/app/dashboard/page.test.jsx (4)
   ✓ Dashboard (4)
     ✓ redirects to login if user is not authenticated
     ✓ renders the dashboard with projects
     ✓ shows empty state when no projects exist
     ✓ navigates to new canvas on "New Project" click

 ✓ src/app/page.test.jsx (3)
   ✓ LoginPage (3)
     ✓ renders the PrisMap title and slogan
     ✓ renders the Sign in with Google button
     ✓ calls signInWithPopup and redirects to dashboard

 ❯ src/app/canvas/[id]/page.test.jsx (7)
   ❯ Canvas Page Detailed Functional Tests (7)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
 Unhandled Error
Error: [vitest-pool]: Worker forks emitted error.
 ❯ EventEmitter.<anonymous>
     node_modules/vitest/dist/chunks/cli-api.B7PN_QUv.js:8043:22
 ❯ ChildProcess.emitUnexpectedExit
     node_modules/vitest/dist/chunks/cli-api.B7PN_QUv.js:7610:22

Caused by: Error: Worker exited unexpectedly
 ❯ ChildProcess.emitUnexpectedExit
     node_modules/vitest/dist/chunks/cli-api.B7PN_QUv.js:7609:33
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 Test Files  4 passed (5)
      Tests  16 passed (23)
     Errors  1 error
   Start at  11:38:29
   Duration  21.06s (transform 842ms, setup 890ms, import 9.56s, tests 343ms, environment 1.58s)
```

---

## 10. Technical Constraints

- Native `canvas` module required by Konva causes segmentation faults in happy-dom.
- Even with mocks, happy-dom cannot fully emulate browser canvas rendering.
- Canvas module tests were verified manually in Chrome browser.
