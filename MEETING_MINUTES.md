# 📋 PrisMap - Meeting Minutes

> **Project:** PrisMap - Infinite Collaborative Canvas  
> **Team Members:** Gowreesh, Kavin, Jeevan, Nishanth, Aakaash  
> **Sprint:** Sprint 1

---

## Meeting 1: Work Split

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| January 1, 2026 | 09:00 AM | 2 hours | In-person |

### Objective
The inaugural meeting focused on understanding the project scope, defining individual responsibilities, and establishing the foundational workflow for PrisMap development. The team gathered to discuss the overall vision of creating an infinite collaborative canvas application with modern UI aesthetics.

### Discussion Summary

**Gowreesh** initiated the meeting by presenting the project concept—a collaborative drawing application with an infinite canvas, similar to tools like Excalidraw and Miro. He emphasized the importance of a glassmorphism design language and proposed using Next.js as the core framework given its excellent developer experience and server-side rendering capabilities.

**Kavin** volunteered to take ownership of the canvas implementation, suggesting Konva.js as the 2D rendering library due to its robust API for shapes, transformations, and event handling. He outlined initial canvas features including zoom, pan, and basic drawing tools.

**Jeevan** expressed interest in handling the authentication system and proposed Firebase for its quick integration with Google Sign-In. He discussed the user flow from login to dashboard and canvas access, ensuring secure session management.

**Nishanth** took responsibility for the UI components, particularly the Navbar and the overall layout structure. He suggested implementing a floating pill-shaped navigation bar with theme toggling (dark/light mode) and user profile display.

**Aakaash** agreed to work on the sidebar components including the Layers Panel and tool selection interface. He proposed a collapsible design pattern that wouldn't obstruct the canvas workspace. The meeting concluded with everyone agreeing to set up the project repository and begin with environment configuration.

---

## Meeting 2: Weekly Meeting

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| January 6, 2026 | 02:05 PM | 2 hours | In-person |

### Objective
First weekly sync to review initial setup progress, discuss blockers, and align on the technology choices before development began in earnest.

### Discussion Summary

**Gowreesh** reported successful initialization of the Next.js 16 project with the App Router structure. He had configured ESLint, Tailwind CSS 4, and PostCSS for styling. The basic folder structure (`src/app`, `src/components`, `src/lib`, `src/hooks`) was established and pushed to the repository.

**Kavin** demonstrated a proof-of-concept canvas using React Konva, showing basic line drawing and shape rendering. He raised concerns about performance with many elements and proposed implementing virtual rendering for off-screen objects. The team agreed to defer optimization until core features were complete.

**Jeevan** shared his progress on Firebase integration. He had created the Firebase project, enabled Google Authentication, and written the configuration in `lib/firebase.js`. He walked through the authentication flow and discussed secure handling of environment variables.

**Nishanth** presented wireframes for the Navbar component featuring search, theme toggle, settings, and logout buttons. He discussed the glassmorphism effect using `backdrop-blur` and semi-transparent backgrounds. The team approved his design direction and suggested adding keyboard shortcut access from the Navbar.

**Aakaash** outlined the data structure for canvas elements, proposing a unified schema with `type`, `id`, `position`, `style`, and type-specific properties. This would enable consistent handling across different tools (pen, shapes, text). The team agreed on this architecture.

---

## Meeting 3: Tech Stack

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| January 9, 2026 | 10:00 AM | 1 hour | Remote |

### Objective
A focused technical session to finalize the technology stack, library versions, and development environment setup to ensure consistency across all team members.

### Discussion Summary

**Gowreesh** led the discussion by proposing the following stack: Next.js 16 with App Router, React 19, Tailwind CSS 4 with PostCSS, and Konva.js with React-Konva bindings. He emphasized using the latest stable versions to leverage new features like React Compiler support and improved performance.

**Kavin** confirmed Konva.js 10.x as the canvas library and discussed its advantages: layered rendering, built-in drag-and-drop, and efficient redrawing. He mentioned the `react-konva` wrapper would allow React-style declarative rendering of canvas elements.

**Jeevan** confirmed Firebase SDK v12 for authentication and explained the Google provider setup. He discussed the security rules needed for future Firestore integration if real-time collaboration was added. For now, the team agreed to focus on local canvas state.

**Nishanth** presented Lucide React as the icon library choice, citing its tree-shaking capabilities and consistent design language. He demonstrated several icons that would be used throughout the application (Settings, Moon, Sun, Search, LogOut).

**Aakaash** suggested adding `uuid` for generating unique element IDs and `react-rnd` for potential resizable/draggable panels. The team documented all dependencies in `package.json` and ensured everyone could run `npm install` without issues. The meeting ended with a successful build verification on all machines.

---

## Meeting 4: Weekly Meeting

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| January 13, 2026 | 02:05 PM | 2 hours | In-person |

### Objective
Progress review on core component development and integration planning. Focus on connecting authentication with protected routes and canvas accessibility.

### Discussion Summary

**Gowreesh** reviewed the overall project progress and noted that the login page was nearly complete. He praised the glassmorphism design achieved through layered translucent divs with blur effects and gradient backgrounds. He demonstrated the animated background blobs using CSS animations and mix-blend modes.

**Kavin** showed significant progress on the canvas page. He had implemented the Stage and Layer setup with Konva, added scroll-to-zoom functionality, and created handlers for mouse events (down, move, up) to enable freehand drawing. He discussed challenges with coordinate transformation when zoomed and how he resolved them using `getRelativePointerPosition`.

**Jeevan** demonstrated the complete login flow: clicking "Sign in with Google" triggered Firebase popup authentication, and upon success, users were redirected to the dashboard. He implemented a loading state during authentication and error handling for failed attempts.

**Nishanth** presented the completed Navbar component with theme toggling functionality. He showed how clicking the moon/sun icon toggled a `dark` class on the document root and persisted the preference in localStorage. The search modal (Ctrl+K) was implemented with a sleek glassmorphism overlay.

**Aakaash** demonstrated the Layers Panel component showing all canvas elements in a scrollable list. Each layer item displayed the element type, and clicking selected that element on the canvas. He discussed plans to add visibility toggles and reordering capabilities in future iterations.

---

## Meeting 5: Weekly Meeting

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| January 20, 2026 | 02:05 PM | 2 hours | In-person |

### Objective
Deep dive into drawing tools implementation, keyboard shortcuts system, and canvas interaction refinements.

### Discussion Summary

**Gowreesh** opened the meeting by discussing the need for comprehensive keyboard shortcuts to improve user productivity. He proposed a custom hook `useKeyboardShortcuts` that would map key combinations to callback functions. The hook would handle modifier keys (Ctrl, Shift, Alt) and prevent triggering when users were typing in input fields.

**Kavin** presented the expanded tools implementation. Beyond the pen tool, he had added shape tools for rectangle, circle, triangle, star, and arrow. Each shape was rendered as a Konva component with consistent selection and transformation handles. He demonstrated the eraser tool using a composite operation to remove strokes.

**Jeevan** focused on the text tool implementation. Users could click anywhere on the canvas to create a text element, and an HTML textarea would overlay for editing. On blur or Enter key, the text would be committed to the canvas as a Konva Text node. He handled font sizing and color matching the current stroke color.

**Nishanth** integrated the keyboard shortcuts into the Navbar and canvas. Tool selection shortcuts (1-9 keys) allowed rapid switching between tools. Global shortcuts Ctrl+K and Ctrl+, opened search and settings respectively. He created a dedicated shortcuts page accessible from the Navbar for user reference.

**Aakaash** worked on the undo/redo system, implementing a history stack that tracked canvas states. Ctrl+Z popped the last state for undo, while Ctrl+Y re-applied undone states. He managed a maximum history size of 50 states to prevent memory issues. The delete key also triggered removal of selected elements.

---

## Meeting 6: Weekly Meeting

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| January 27, 2026 | 02:05 PM | 2 hours | In-person |

### Objective
Review of canvas enhancements, discussion on settings page development, and addressing UI polish items.

### Discussion Summary

**Gowreesh** discussed the settings page requirements. He proposed sections for appearance (theme selection), canvas defaults (grid visibility, snap-to-grid), and account information. The page would follow the same glassmorphism design language as the login and shortcuts pages.

**Kavin** reported completing the zoom control UI with dedicated buttons for zoom in, zoom out, and reset to 100%. He implemented smooth animated transitions between zoom levels using Konva's `scaleX/scaleY` properties. The current zoom percentage was displayed in the canvas toolbar.

**Jeevan** worked on the dashboard page design. After login, users would see a welcoming interface with options to create a new canvas or open recent projects. He implemented a grid layout for project cards with hover effects and glassmorphism styling.

**Nishanth** presented refinements to the Navbar including the user avatar display (pulled from Google account), improved transitions for theme toggle, and accessibility improvements with proper ARIA labels. He ensured keyboard navigation worked correctly between focusable elements.

**Aakaash** enhanced the Layers Panel with drag-and-drop reordering capability. Users could now change the z-order of elements by dragging layer items. He also added opacity controls and visibility toggles per layer, giving users finer control over their canvas composition.

---

## Meeting 7: Canvas Page

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| January 27, 2026 | 04:00 PM | 2 hours | In-person |

### Objective
Intensive session focused solely on the canvas page functionality, debugging edge cases, and performance optimization.

### Discussion Summary

**Gowreesh** facilitated the session by creating a comprehensive test plan for canvas interactions. He listed scenarios including drawing at different zoom levels, selecting and moving grouped elements, undo after delete, and behavior at canvas boundaries.

**Kavin** identified and fixed a critical bug where coordinates were miscalculated after panning the canvas. The fix involved properly accounting for the stage's position offset in addition to the scale factor. He walked the team through the mathematical transformations involved.

**Jeevan** discovered an issue with text editing where the HTML textarea wasn't positioned correctly on zoomed canvas. He implemented dynamic positioning calculations that transformed stage coordinates to viewport coordinates using the stage's `getAbsoluteTransform` method.

**Nishanth** tested the keyboard shortcuts extensively and found conflicts with browser defaults. Ctrl+S was triggering the browser's save dialog, so he added `event.preventDefault()` for all registered shortcuts. He compiled a list of safe key combinations to avoid future conflicts.

**Aakaash** profiled the canvas performance with 500+ elements. He identified that re-rendering the entire Stage on every change was inefficient and proposed lazy rendering for elements outside the viewport. For Sprint 1, the team decided to proceed with the current implementation and mark optimization as a future task.

---

## Meeting 8: Review

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| January 29, 2026 | 07:00 PM | 1 hour | In-person |

### Objective
Mid-sprint review to assess progress against sprint goals, identify remaining work, and adjust priorities for the final week.

### Discussion Summary

**Gowreesh** presented the sprint burndown showing good progress on core features. The login page, canvas page, navbar, and basic tools were complete. Outstanding items included the settings page polish, keyboard shortcuts documentation page, and final testing. He proposed dedicating the remaining time to stabilization rather than new features.

**Kavin** confirmed all planned drawing tools were functional: select, pen, eraser, text, rectangle, circle, triangle, star, and arrow. He demonstrated each tool and acknowledged minor UI improvements needed for the tool selection panel. Selection handles and resize functionality were working but needed visual refinement.

**Jeevan** reported that authentication was robust with proper error handling and loading states. He suggested adding a sign-out confirmation modal to prevent accidental logouts, which the team agreed to defer to post-Sprint 1.

**Nishanth** showed the shortcuts page with all keyboard shortcuts documented in a clean, categorized layout. The page used the same glassmorphism design with KeyBadge components styled as physical keyboard keys. He requested feedback on the color scheme which was approved by the team.

**Aakaash** confirmed the Layers Panel was functioning well for basic use cases. He noted that very long element lists might need virtualization for performance, which was logged as a future improvement. The team collectively agreed Sprint 1 was on track for completion.

---

## Meeting 9: Weekly Meeting

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| February 3, 2026 | 02:05 PM | 2 hours | In-person |

### Objective
Final development push discussion, bug fixes prioritization, and documentation requirements for Sprint 1 closure.

### Discussion Summary

**Gowreesh** outlined the final tasks: completing the settings page UI, ensuring all pages were responsive, verifying the build process, and writing README documentation. He assigned documentation to himself and requested final testing from each team member on their respective components.

**Kavin** fixed a bug where the canvas wasn't receiving focus after clicking outside input elements, causing keyboard shortcuts to fail. He implemented an automatic focus mechanism and tested all tool shortcuts thoroughly. The canvas save functionality using Ctrl+S was confirmed working.

**Jeevan** added JSDoc comments to the authentication-related code including `lib/firebase.js` and the login page component. He ensured error messages were user-friendly and suggested implementing toast notifications in future sprints for better feedback.

**Nishanth** completed responsive styling for the Navbar ensuring it worked on tablet and mobile viewports. He collapsed certain elements on smaller screens and ensured touch interactions worked for the theme toggle and menu items. The search modal was confirmed functional on mobile.

**Aakaash** finalized the Layers Panel styling, ensuring visibility toggle icons and opacity sliders had proper contrast in both light and dark themes. He tested the panel's behavior when rapidly adding and removing elements to verify no memory leaks or rendering issues existed.

---

## Meeting 10: Diagrams and Feature Updates

| **Date** | **Time** | **Duration** | **Location** |
|----------|----------|--------------|--------------|
| February 4, 2026 | 10:00 AM | 3 hours | In-person |

### Objective
Final Sprint 1 meeting to review all completed features, create architecture diagrams for documentation, and prepare for sprint demo.

### Discussion Summary

**Gowreesh** led the session by creating system architecture diagrams using a whiteboard. He illustrated the component hierarchy from the App Shell (layout.js) down through pages (login, dashboard, canvas, settings, shortcuts) and shared components (Navbar, LayersPanel). The diagram showed data flow from Firebase authentication through the React context to protected routes.

**Kavin** documented the canvas rendering pipeline: user input → event handlers → state update → Konva re-render → visual output. He created flowcharts for each tool's interaction model, helping future developers understand the drawing logic. All shape rendering functions were confirmed to have proper JSDoc documentation.

**Jeevan** presented the authentication sequence diagram showing the complete flow: user clicks login → Firebase popup → Google OAuth → token exchange → Firebase user object → redirect to dashboard. He ensured the `useRouter` navigation was correctly handling authenticated and unauthenticated states.

**Nishanth** demonstrated the complete UI theme system. He created a reference document showing CSS custom properties used for colors, their light/dark mode values, and the toggle mechanism. The glassmorphism effect using `backdrop-blur-xl` and `bg-white/70` was documented as the signature design pattern.

**Aakaash** compiled the final feature list and confirmed all keyboard shortcuts were documented both in code (JSDoc) and in the user-facing shortcuts page. He ran through a final end-to-end test: login, create canvas elements using all tools, use keyboard shortcuts, toggle theme, check layers panel, and logout. All tests passed successfully. The team concluded Sprint 1 with confidence in the deliverable.

---

## 📊 Sprint 1 Summary

| Feature | Owner | Status |
|---------|-------|--------|
| Next.js Project Setup | Gowreesh | ✅ Complete |
| Firebase Authentication | Jeevan | ✅ Complete |
| Login Page (Glassmorphism) | Gowreesh | ✅ Complete |
| Canvas Page with Konva | Kavin | ✅ Complete |
| Drawing Tools (9 tools) | Kavin | ✅ Complete |
| Navbar Component | Nishanth | ✅ Complete |
| Theme Toggle (Dark/Light) | Nishanth | ✅ Complete |
| Layers Panel | Aakaash | ✅ Complete |
| Keyboard Shortcuts Hook | Gowreesh | ✅ Complete |
| Shortcuts Reference Page | Nishanth | ✅ Complete |
| Settings Page | Gowreesh | ✅ Complete |
| JSDoc Documentation | All | ✅ Complete |
| README Documentation | Gowreesh | ✅ Complete |

---

<p align="center">
  <em>Meeting minutes maintained by PrisMap Development Team</em>
</p>
