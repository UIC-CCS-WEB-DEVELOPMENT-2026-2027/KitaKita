/**
 * FILE OVERVIEW: Login.jsx
 *
 * WHAT IT DOES:
 *   The page component for the /login route. It decides what to show based on auth state:
 *   a loading message, a redirect (already signed in), or the login page layout
 *   (header, LoginForm card, and a benefits sidebar).
 *
 * WHERE IT FITS:
 *   It is a route-level "page" component, mapped to /login by react-router-dom.
 *   It is the counterpart of ProtectedRoute.jsx: ProtectedRoute sends signed-out users
 *   here and stores the page they wanted in location.state.from; this page reads that
 *   value and sends them back after login. It composes Loading.jsx and LoginForm.jsx.
 *
 * REACT MECHANICS USED:
 *   - Custom hook useAuth() -> { user, ready } (shared auth state from context)
 *   - useLocation() from react-router-dom to read location.state.from
 *   - Conditional rendering with early returns (if (!ready), if (user))
 *   - <Navigate replace> for declarative redirects
 *   - Child components: <Loading />, <LoginForm /> (rendered with NO props here)
 *   - No useState in this file, no props received, no .map()/.filter() (the benefits list is static JSX)
 */

// Import Navigate (declarative redirect component) and useLocation (hook to read the current URL/state) from the router library
import { Navigate, useLocation } from 'react-router-dom'
// Import the Loading component to show while auth status is still being determined
import Loading from './Loading.jsx'
// Import the LoginForm component that holds the actual form fields and submit logic
import LoginForm from './LoginForm.jsx'
// Import the custom useAuth hook that exposes the current user and the "ready" flag from auth context
import { useAuth } from '../hooks/useAuth.js'

// The /login page. Already signed in? Go straight to where the person was headed.
// Export the Login page component as the default export so the router can mount it at /login
export default function Login() {
  // Read the shared auth state: `user` is the signed-in user (or null) and `ready` says whether the saved session has finished loading
  const { user, ready } = useAuth()
  // Get the current location object; ProtectedRoute may have stored { from: '/some-path' } in location.state
  const location = useLocation()

  // If auth is not ready yet, render the Loading component and stop, so we never redirect or show the form based on incomplete info
  if (!ready) return <Loading />
  // If a user exists, redirect to the page they originally wanted (location.state?.from) or fall back to '/'; `replace` swaps the history entry so Back does not return to /login
  if (user) return <Navigate to={location.state?.from || '/'} replace />

  // Nobody is signed in and auth is ready, so return the login page JSX
  return (
    // Outer wrapper div with the shared "wrap" page container class
    <div className="wrap">
      {/* Accessibility "skip link": keyboard users can jump straight to the element with id="main" */}
      <a className="skip-link" href="#main">Skip to main content</a>

      {/* Container for the whole auth page layout */}
      <div className="auth-page">
        {/* Header element holding the brand and tagline */}
        <header className="app-header">
          {/* Plain div grouping the brand title and tagline */}
          <div>
            {/* Main page heading (h1) showing the app name, split into two styled spans */}
            <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
            {/* Tagline paragraph describing the product */}
            <p className="tag">cash register for startups</p>
          {/* Close the grouping div */}
          </div>
        {/* Close the header */}
        </header>

        {/* Two-column layout: the form card on one side, the benefits aside on the other */}
        <div className="auth-layout">
          {/* Main landmark; id="main" is the target of the skip link above */}
          <main id="main">
            {/* Card container that visually frames the form */}
            <div className="card auth-card">
              {/* Render the LoginForm; no props are passed, so headingRef, initialEmail and onForgot are all undefined inside it */}
              <LoginForm />
            {/* Close the card */}
            </div>
            {/* Small note telling users this is a prototype and data stays in the browser */}
            <p className="note auth-note">
              {/* The note's text content (a single line of plain text, not a comment) */}
              Prototype sign-in: the account and your data stay in this browser.
            {/* Close the note paragraph */}
            </p>
          {/* Close the main landmark */}
          </main>

          {/* Sidebar (aside landmark) styled as a card; aria-labelledby links it to its heading by id for screen readers */}
          <aside className="card auth-aside" aria-labelledby="aside-title">
            {/* Sidebar heading; its id matches aria-labelledby above */}
            <h2 id="aside-title">Know where your cash stands</h2>
            {/* Paragraph summarising what the app does */}
            <p>Record sales and expenses as they happen, then see your runway, break-even point and profit split.</p>
            {/* Unordered list of benefits; written out by hand, NOT generated with .map() */}
            <ul className="auth-benefits">
              {/* First benefit */}
              <li>A quick register for sales and expenses</li>
              {/* Second benefit */}
              <li>Monthly insights in plain language</li>
              {/* Third benefit */}
              <li>Export every entry to CSV</li>
            {/* Close the list */}
            </ul>
          {/* Close the aside */}
          </aside>
        {/* Close the two-column layout */}
        </div>
      {/* Close the auth page container */}
      </div>
    {/* Close the outer wrapper */}
    </div>
  // Close the parentheses around the returned JSX
  )
// Close the component function body
}