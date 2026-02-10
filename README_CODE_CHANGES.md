# Required Code Changes for Main Project

## Overview
This document outlines changes required in the **main application code** (`src/`) to resolve integration test failures. These are **bug fixes**, not just test adjustments.

## 1. Canvas Page (`src/app/canvas/page.jsx`)

### Issue: ReferenceError
The application throws a `ReferenceError: Cannot access 'deleteSelected' before initialization` during runtime render. This happens because `deleteSelected` is used in a `useEffect` hook before it is defined.

### Change Required
**Move `useEffect` Hook**: The `useEffect` block handling keyboard shortcuts (using `deleteSelected` as a dependency) must be moved **after** the definition of the `deleteSelected` function.

**Location:** `src/app/canvas/page.jsx`

**Current (Buggy) Order:**
```javascript
// ...
useEffect(() => { ... }, [deleteSelected]); // ❌ Error: deleteSelected not defined yet
// ...
const deleteSelected = () => { ... };
```

**Fixed Order:**
```javascript
// ...
const deleteSelected = useCallback(() => { ... }, [...]); 
// ...
useEffect(() => { ... }, [deleteSelected]); // ✅ Correct
```

## 2. Default Page / Dashboard (Potential)

### Issue: Auth Redirect Logic
While not a hard crash, the integration tests revealed that auth redirection timing in `useEffect` can be flaky if not handled robustly.

### Recommendation
Ensure all `useRouter` pushes are wrapped in a check for `loading` state to prevent race conditions where a redirect happens before the auth state is fully resolved.

---
**Note:** The failure in `routes.test.jsx` regarding "Multiple 'Ctrl' elements" was a **Test File Change** (updating the test to handle multiple elements), not a main code change.
