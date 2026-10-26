/*
 * =============================================================================
 * FILE OVERVIEW: AccountSettings.jsx
 * =============================================================================
 * WHAT IT DOES:
 *   Renders the signed-in-only /settings page. It shows the app header (brand,
 *   username, "Back to register", "Log out") and a main area with two child
 *   forms: one to change the username and one to change the password.
 *
 * WHERE IT FITS:
 *   It is a ROUTE-LEVEL page component. react-router mounts it at /settings.
 *   It owns no form logic itself. It only composes ChangeUsernameForm and
 *   ChangePasswordForm, and it reads the logged-in user from the shared auth
 *   hook (useAuth), which presumably wraps a React Context.
 *
 * PRIMARY REACT MECHANICS:
 *   - Custom hook: useAuth() returns { user, logout } (it exposes the current
 *     user object and a logout function).
 *   - No useState here and no props received. Data arrives through the hook.
 *   - Props passed: none to the child forms. They get what they need through
 *     their own hooks.
 *   - Routing: <Link to="/"> does client-side navigation without a reload.
 *   - Event handler: onClick={logout} passes the function reference itself.
 *   - No .map() or .filter() in this file.
 *   - Accessibility: skip link, id="main" target, decorative icon.
 * =============================================================================
 */

// Import the Link component from react-router-dom so we can navigate without reloading the page.
import { Link } from 'react-router-dom'
// Import the password form component; it is rendered later inside the settings grid.
import ChangePasswordForm from './ChangePasswordForm.jsx'
// Import the username form component; it is rendered later inside the settings grid.
import ChangeUsernameForm from './ChangeUsernameForm.jsx'
// Import the LogOutIcon (a small SVG component) for the Log out button.
import { LogOutIcon } from './Icons.jsx'
// Import the custom hook that gives this component access to the logged-in user and the logout function.
import { useAuth } from '../hooks/useAuth.js'

// The /settings page (signed-in only). Named AccountSettings so it never clashes with
// the existing Settings.jsx panel (opening balance and currency).
// Declare and default-export the page component; React calls this function every time it renders.
export default function AccountSettings() {
  // Call the useAuth hook and destructure two things: user (the logged-in user object) and logout (a function that signs out).
  const { user, logout } = useAuth()

  // Return the JSX (the UI description) that this component renders.
  return (
    // Outer wrapper div; className "wrap" is a CSS class that centres and sizes the page layout.
    <div className="wrap">
      {/* Skip link: lets keyboard and screen-reader users jump straight to the main content; href="#main" matches the id on <main> below. */}
      <a className="skip-link" href="#main">Skip to main content</a>

      {/* Header element: holds the brand on the left and the user actions on the right. */}
      <header className="app-header">
        {/* Plain wrapper div that groups the brand and tagline together on the left side. */}
        <div>
          {/* Page title: two styled spans (k1 and k2) let CSS colour each "Kita" word differently. */}
          <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
          {/* Tagline paragraph describing the app. */}
          <p className="tag">cash register for startups</p>
        {/* Close the brand wrapper div. */}
        </div>
        {/* Right-hand group of header controls. */}
        <div className="header-actions">
          {/* Show the username from the user object; title gives a tooltip in case CSS truncates a long name. */}
          <span className="user-name" title={user.username}>{user.username}</span>
          {/* Link styled as a button; to="/" navigates back to the register page using client-side routing. */}
          <Link className="btn" to="/">Back to register</Link>
          {/* Log out button: type="button" prevents form submission, and onClick={logout} passes the function reference from useAuth so it runs on click. */}
          <button type="button" className="btn" onClick={logout}>
            {/* Decorative icon component placed before the text; the text label remains for accessibility. */}
            <LogOutIcon /> Log out
          {/* Close the Log out button. */}
          </button>
        {/* Close the header-actions div. */}
        </div>
      {/* Close the header element. */}
      </header>

      {/* Main landmark: id="main" is the target of the skip link above. */}
      <main id="main">
        {/* Wrapper for the page heading and its subtitle. */}
        <div className="page-head">
          {/* Heading naming this page. */}
          <h2 className="auth-title">Account settings</h2>
          {/* Subtitle telling the user changes save immediately and no re-login is needed. */}
          <p className="auth-sub">Changes apply right away. You stay logged in.</p>
        {/* Close the page-head div. */}
        </div>

        {/* Grid container (CSS class register-grid) that lays the two forms out side by side or stacked. */}
        <div className="register-grid">
          {/* Render the username form; it manages its own state and gets auth data through its own hooks, so no props are passed. */}
          <ChangeUsernameForm />
          {/* Render the password form; same pattern, so it is modular and self-contained. */}
          <ChangePasswordForm />
        {/* Close the register-grid div. */}
        </div>
      {/* Close the main element. */}
      </main>
    {/* Close the outer wrap div. */}
    </div>
  // Close the parentheses that wrap the returned JSX.
  )
// Close the AccountSettings function body.
}
