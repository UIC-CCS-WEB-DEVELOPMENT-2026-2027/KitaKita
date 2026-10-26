/*
 * =============================================================================
 * FILE OVERVIEW: main.jsx
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * main.jsx is the ENTRY POINT of the whole React app. The browser loads it
 * first (index.html has a <script type="module" src="/src/main.jsx">). It finds
 * the <div id="root"> in index.html and tells React to draw the component tree
 * inside it. It contains no component of its own, only the "bootstrap" call.
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   index.html  (<div id="root"></div>)
 *     main.jsx   <-- YOU ARE HERE
 *       React.StrictMode      (development-only checker, renders no visible UI)
 *         AuthProvider        (context/AuthContext.jsx: holds login state for the whole app)
 *           App               (App.jsx: shows <Auth /> or <Tracker /> depending on the user)
 *   styles.css is imported here so the CSS applies to the entire app.
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 *   - createRoot(...).render(...): the React 18 way to mount an app into the DOM.
 *   - <React.StrictMode>: extra development checks; it intentionally runs some
 *     things twice (renders, effects) to expose impure code. It does nothing in production.
 *   - <AuthProvider> (a Context provider) wraps <App />. The wrapped component is
 *     passed as `children`. That is how useAuth() in App.jsx can read the
 *     user/logout without prop drilling.
 *   - No useState, no props passed, no array iteration in this file.
 * =============================================================================
 */

// Import the React object; needed here because the code below uses <React.StrictMode>.
import React from 'react'
// Import createRoot, the React 18 function that attaches a React app to a real DOM element.
import { createRoot } from 'react-dom/client'
// Import the root App component (App.jsx), which decides between the login screen and the tracker.
import App from './App.jsx'
// Import AuthProvider, the context provider that stores the logged-in user and shares it with every component below it.
import { AuthProvider } from './context/AuthContext.jsx'
// Import the global stylesheet; Vite injects its CSS into the page (nothing is assigned to a variable).
import './styles.css'

// Find the <div id="root"> in index.html, create a React root on it, and call .render() to draw the component tree inside it.
createRoot(document.getElementById('root')).render(
  // Open StrictMode: a development-only wrapper that highlights unsafe patterns (such as impure renders) by double-invoking them.
  <React.StrictMode>
    {/* Open AuthProvider: every component inside it can read the auth context (user, login, logout) through useAuth(). */}
    <AuthProvider>
      {/* Render App as the child of AuthProvider; App calls useAuth() and reaches the shared auth state with no props. */}
      <App />
    {/* Close AuthProvider. */}
    </AuthProvider>
  {/* Close StrictMode. */}
  </React.StrictMode>
// Close the .render( call.
)