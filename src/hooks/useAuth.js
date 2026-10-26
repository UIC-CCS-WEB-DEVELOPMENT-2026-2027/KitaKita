/*
 * =============================================================================
 * FILE OVERVIEW: useAuth.js (hooks/useAuth.js)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * useAuth.js defines ONE custom React hook, useAuth(). A custom hook is a
 * function whose name starts with "use" and which calls other hooks inside it.
 * This one is a thin wrapper around useContext. It reads the value that
 * <AuthProvider> shares and returns it, so components can write
 *   const { user, logout } = useAuth()
 * instead of importing useContext and AuthContext themselves.
 * It also acts as a safety check: if a component calls useAuth() outside of
 * <AuthProvider>, it throws a clear error instead of failing later with a
 * confusing "cannot read property of null".
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   main.jsx          wraps <App /> in <AuthProvider>.
 *   context/AuthContext.jsx  creates AuthContext and holds the auth state
 *                     (the `user` in useState, plus login/signup/logout functions).
 *   hooks/useAuth.js  <-- YOU ARE HERE: the doorway components use to read that context.
 *   App.jsx           calls `const { user, logout } = useAuth()` to choose
 *                     between <Auth /> and <Tracker />.
 *   Other components (Auth.jsx, Settings.jsx) can call it the same way.
 *   State flow: this file holds NO state. The state lives inside AuthProvider.
 *   When it changes, every component that called useAuth() re-renders.
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 *   - useContext(AuthContext): reads the nearest AuthProvider's value (the
 *     alternative to passing props through every level, called "prop drilling").
 *   - Custom hook rule: it may only be called at the top level of a component
 *     or another hook, never inside loops, conditions or normal functions.
 *   - Guard clause with throw: `if (!ctx) throw ...` works because the context
 *     default value is presumably null, which means "no provider above me".
 *     (Confirm this in AuthContext.jsx; the guard only makes sense if the
 *     default is null/undefined.)
 *   - No useState, no props, no JSX, no .map() or .filter() in this file.
 * =============================================================================
 */

// Import the useContext hook from React; it reads the current value of a context.
import { useContext } from 'react'
// Import AuthContext, the context object created in AuthContext.jsx; useContext needs it to know WHICH context to read.
import { AuthContext } from '../context/AuthContext.jsx'

// Original comment kept: it documents the shape of the object that useAuth() returns (the value provided by AuthProvider).
// { user, isAuthenticated, isAdmin, login, signup, updateAccount, logout, requestPasswordReset }
// Export the custom hook; the name starts with "use" so React's lint rules treat it as a hook. It takes no arguments.
export function useAuth() {
  // Ask React for the current AuthContext value; it is the object provided by the nearest <AuthProvider> above this component in the tree.
  const ctx = useContext(AuthContext)
  // Guard clause: a falsy ctx (null) means no <AuthProvider> wraps this component, so stop immediately with a helpful error message.
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.')
  // Hand the auth object (user, login, logout, etc.) to the calling component, which usually destructures what it needs.
  return ctx
// Close the useAuth function.
}