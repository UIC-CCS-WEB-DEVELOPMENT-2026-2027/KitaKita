/**
 * FILE OVERVIEW: Loading.jsx
 *
 * WHAT IT DOES:
 *   A tiny presentational component that shows a "Loading…" message while the app
 *   is still working out whether a user is signed in.
 *
 * WHERE IT FITS:
 *   It is rendered by Login.jsx and ProtectedRoute.jsx whenever `ready` from the
 *   useAuth() hook is false (the saved session has not been read yet). It prevents
 *   the user from being sent to the wrong page too early.
 *
 * REACT MECHANICS USED:
 *   - Functional component with a default export
 *   - No state, no props, no hooks, and no array iteration (.map/.filter)
 *   - JSX with a className and an ARIA role="status" so screen readers announce it
 */

// Export this function as the file's default export so other files can import it under any name
export default function Loading() {
  // Return the JSX that React will render for this component
  return (
    // Outer wrapper div; the "wrap" CSS class gives it the standard page container layout
    <div className="wrap">
      {/* Paragraph styled by the "empty" class; role="status" makes screen readers announce the text politely */}
      <p className="empty" role="status">Loading…</p>
    {/* Closing tag of the wrapper div */}
    </div>
  // Close the parentheses that wrap the returned JSX
  )
// Close the component function body
}