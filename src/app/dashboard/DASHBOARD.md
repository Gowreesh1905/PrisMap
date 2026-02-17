# Dashboard Module — Full Code Documentation

> **Path:** `src/app/dashboard/`
> **Framework:** Next.js (App Router) · React · Firebase (Auth + Firestore)

---

## File Overview

| File | Lines | Purpose |
|---|---|---|
| `page.jsx` | 261 | Main Dashboard page — auth guard, real-time project list, profile-completion modal, canvas creation |
| `page.test.jsx` | 115 | Vitest + React Testing Library unit tests for the Dashboard component |

---

## `page.jsx` — Dashboard Page Component

### Imports

```jsx
"use client"; // Marks this as a Client Component (required for hooks & browser APIs)

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";           // Next.js client-side navigation
import { onAuthStateChanged } from "firebase/auth";     // Firebase Auth listener
import {
  collection, query, where, onSnapshot,
  orderBy, doc, getDoc
} from "firebase/firestore";                            // Firestore query & real-time
import { auth, db } from "@/lib/firebase";              // Shared Firebase instances
import { Plus, Layout, Loader2, UserCheck, ArrowRight } from "lucide-react"; // Icons
import Navbar from "@/components/Navbar";                // Shared navigation bar
```

---

### State Variables

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `loading` | `boolean` | `true` | Controls the full-screen loading spinner until Firestore data arrives |
| `user` | `object \| null` | `null` | Holds the currently authenticated Firebase user object |
| `projects` | `array` | `[]` | Stores the user's canvas projects fetched in real-time from Firestore |
| `showProfileModal` | `boolean` | `false` | Toggles the "Complete Your Profile" modal dialog |

---

### `useEffect` — Authentication Listener (Lines 26–40)

```jsx
useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (curr) => {
    if (!curr) {
      router.push("/");  // Not authenticated → redirect to login
    } else {
      setUser(curr);     // Authenticated → store user object
    }
  });
  return () => unsubscribeAuth(); // Cleanup on unmount
}, [router]);
```

**Behavior:**
- Subscribes to Firebase Auth state changes on mount.
- If no user is signed in (`curr` is `null`), immediately redirects to the root `/` (login page).
- Otherwise, sets the `user` state, which triggers the downstream effects.
- Returns the unsubscribe function for cleanup.

---

### `useEffect` — Real-Time Firestore Projects (Lines 42–68)

```jsx
useEffect(() => {
  if (!user) return;

  const q = query(
    collection(db, "canvases"),
    where("ownerId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const unsubscribeProjects = onSnapshot(q, (snap) => {
    setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  }, (error) => {
    if (error.code !== "permission-denied") {
      console.error("Error fetching projects:", error);
    }
  });

  return () => unsubscribeProjects();
}, [user]);
```

**Behavior:**
- Waits until `user` is available before subscribing.
- Queries the `canvases` Firestore collection filtered by `ownerId == user.uid`, ordered newest-first.
- Uses `onSnapshot` for **real-time updates** — any change in Firestore is immediately reflected in the UI.
- Maps each document to `{ id, ...data }` and stores in `projects` state.
- Sets `loading` to `false` once data arrives.
- Silently ignores `permission-denied` errors (which can fire during logout transitions).

---

### `useEffect` — Profile Completion Check (Lines 71–95)

```jsx
useEffect(() => {
  if (!user) return;

  const checkProfile = async () => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      if (!data.bio || !data.jobTitle || !data.phoneNumber) {
        setShowProfileModal(true); // Missing fields → show modal
      }
    } else {
      setShowProfileModal(true);   // No user document → new user
    }
  };

  checkProfile();
}, [user]);
```

**Behavior:**
- Reads the current user's document from the `users` collection.
- If the document **doesn't exist** or is **missing** any of `bio`, `jobTitle`, or `phoneNumber`, the profile-completion modal is displayed.
- Errors are caught and logged to the console.

---

### `handleCreateCanvas` Function (Lines 101–104)

```jsx
const handleCreateCanvas = () => {
  const newId = crypto.randomUUID();
  router.push(`/canvas/${newId}`);
};
```

- Generates a cryptographically random UUID via the Web Crypto API.
- Navigates the user to `/canvas/<newId>`, where the canvas page handles creating the Firestore document.

---

### JSX Render — Loading State (Lines 106–112)

```jsx
if (loading) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg-base)]">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );
}
```

- Shows a centered spinning `Loader2` icon while Firestore data is loading.

---

### JSX Render — Main Dashboard (Lines 114–217)

#### Decorative Background
Two large, blurred gradient circles (purple and blue) fixed behind all content for a glassmorphism effect.

#### Navbar
```jsx
<Navbar user={user} projects={projects} />
```
Passes the current `user` and `projects` to the shared navigation component.

#### Page Header
Displays the heading **"My Canvases"** and a project count badge (e.g., `"3 Total Projects"`).

#### Project Grid (Lines 130–151)
A responsive CSS Grid layout:
- **1 column** on mobile, **2 on `sm`**, **4 on `lg`**, **5 on `xl`**.
- First item is always the **"New Project" button** (dashed border card with a `+` icon).
- Remaining items are `<ProjectCard>` components rendered from the `projects` array.

#### Empty State (Lines 154–160)
If `projects.length === 0`, a centered message with a `<Layout>` icon is shown:
> *"Your workspace is empty — Create your first infinite canvas to get started."*

#### Profile Completion Modal (Lines 163–215)
Rendered when `showProfileModal` is `true`:
- **Overlay:** Full-screen black backdrop with blur.
- **Card:** Rounded card with a gradient header, `UserCheck` icon, checklist of missing items (bio, job title, phone number).
- **Primary CTA:** `"Setup Profile Now"` button → navigates to `/settings_page?edit=true`.
- **Dismiss:** `"I'll do this later"` link → closes the modal by setting `showProfileModal` to `false`.

---

## `ProjectCard` Component (Lines 235–261)

```jsx
function ProjectCard({ title, date, id }) {
  const router = useRouter();
  // ...
}
```

### Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` (optional) | Display title. Falls back to `"Untitled Project"` |
| `date` | `Date` (optional) | JavaScript Date object for "Edited" text. Falls back to `"Modified recently"` |
| `id` | `string` | Firestore document ID used for navigation |

### Layout
- **Aspect ratio:** `4:5` (portrait card).
- **Top 75%:** Preview section with a dotted grid background and a `<Layout>` icon that turns purple on hover.
- **Bottom 25%:** Title (truncated) + formatted edit date in small uppercase tracking text.

### Interactions
- **Click:** Navigates to `/canvas/<id>`.
- **Hover:** Card lifts (`-translate-y-1`), gains a purple shadow, and the grid icon changes color.

---

## `page.test.jsx` — Unit Tests

### Test Setup

```jsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
```

**Mocked Modules:**
- `firebase/firestore` — all query/snapshot functions are replaced with `vi.fn()`.
- `next/navigation` — `useRouter` is mocked to capture `push` calls.
- `firebase/auth` — `onAuthStateChanged` is mocked to simulate auth states.

### `beforeEach` Setup

| Mock | Default Value | Purpose |
|---|---|---|
| `useRouter` | `{ push: mockPush }` | Captures navigation calls |
| `onAuthStateChanged` | Calls callback with `{ uid: 'test-user-id' }` | Simulates authenticated user |
| `getDoc` | Returns complete profile (`bio`, `jobTitle`, `phoneNumber`) | Prevents profile modal from showing |

### Test Cases

#### 1. `redirects to login if user is not authenticated`
- **Setup:** `onAuthStateChanged` callback receives `null`.
- **Assertion:** `router.push("/")` is called.

#### 2. `renders the dashboard with projects`
- **Setup:** `onSnapshot` returns two mock projects with `id`, `title`, and `createdAt`.
- **Assertions:**
  - `"My Canvases"` heading is visible.
  - Both `"Project 1"` and `"Project 2"` titles are rendered.
  - `"2 Total Projects"` counter is displayed.

#### 3. `shows empty state when no projects exist`
- **Setup:** `onSnapshot` returns an empty `docs` array.
- **Assertion:** `"Your workspace is empty"` message is visible.

#### 4. `navigates to new canvas on "New Project" click`
- **Setup:** Empty project list, then clicks the `"New Project"` button.
- **Assertion:** `router.push` is called with a path matching `/canvas/<uuid>`.

---

## Architecture Diagram

```
┌───────────────────────────────────────────────┐
│                  Dashboard                     │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  useEffect: Auth Listener               │  │
│  │  onAuthStateChanged → setUser / redirect│  │
│  └──────────────┬──────────────────────────┘  │
│                 │ user available               │
│  ┌──────────────▼──────────────────────────┐  │
│  │  useEffect: Firestore Subscription      │  │
│  │  onSnapshot("canvases") → setProjects   │  │
│  └──────────────┬──────────────────────────┘  │
│                 │                              │
│  ┌──────────────▼──────────────────────────┐  │
│  │  useEffect: Profile Check               │  │
│  │  getDoc("users") → setShowProfileModal  │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  Render                                 │  │
│  │  ├── Navbar                             │  │
│  │  ├── "New Project" button               │  │
│  │  ├── ProjectCard[] (mapped)             │  │
│  │  ├── Empty State (conditional)          │  │
│  │  └── Profile Modal (conditional)        │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

---

## Key Dependencies

| Package | Usage |
|---|---|
| `next/navigation` | `useRouter` for client-side page transitions |
| `firebase/auth` | `onAuthStateChanged` for auth state management |
| `firebase/firestore` | `onSnapshot`, `query`, `where`, `orderBy`, `getDoc` for real-time data |
| `@/lib/firebase` | App-level `auth` and `db` singleton instances |
| `lucide-react` | Icon components (`Plus`, `Layout`, `Loader2`, `UserCheck`, `ArrowRight`) |
| `@/components/Navbar` | Shared navigation bar component |
