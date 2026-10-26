/*
 * =============================================================================
 * FILE OVERVIEW: Auth.jsx (components/Auth.jsx)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * Auth is the logged-out screen. It shows the brand header, a Log In / Sign Up
 * tab switch, and one of three forms (LoginForm, SignUpForm, ForgotPasswordForm)
 * depending on which "view" is active. A side panel (aside) lists the app's benefits.
 * It also manages keyboard focus when moving to/from the "forgot password" screen.
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   App.jsx renders <Auth /> when useAuth() returns no user.
 *   Auth (this file) owns two pieces of state and passes them to its three children:
 *     LoginForm          props: headingRef, initialEmail, onForgot
 *     SignUpForm         props: headingRef
 *     ForgotPasswordForm props: headingRef, initialEmail, onBack
 *   When a login/sign-up succeeds, AuthContext calls setUser, App re-renders,
 *   and this component disappears.
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 * STATE (useState):
 *   - view  : 'login' | 'signup' | 'forgot'. Decides which form is shown and whether the tabs show.
 *   - email : text typed on the Log In form, carried to the Forgot password form (state lifted to this parent
 *             so two sibling forms can share it).
 * REFS (useRef):
 *   - headingRef : given to the child forms (as a prop) so each can attach it to its heading; this component calls .focus() on it.
 *   - prevView   : stores the PREVIOUS view; changing a ref does not re-render.
 * EFFECT (useEffect, deps [view]): after a view change, if we moved to or from 'forgot', focus the heading.
 * ARRAY ITERATION:
 *   - TABS.map(([id, label]) => <button key={id} .../>) builds the two tab buttons.
 * PROPS PASSED DOWN: data (initialEmail), callbacks (onForgot, onBack), a ref (headingRef).
 *   Callbacks let children ask the parent to change its state ("lifting state up").
 * CONDITIONAL RENDERING: {view === 'login' && ...} so only one form is mounted at a time.
 * ARIA: aria-current marks the active tab; aria-label / aria-labelledby name regions.
 * =============================================================================
 */

// Import useEffect (run code after render), useRef (persistent boxes) and useState (state) from React.
import { useEffect, useRef, useState } from 'react'
// Import the forgot-password form, shown when view === 'forgot'.
import ForgotPasswordForm from './ForgotPasswordForm.jsx'
// Import the login form, shown when view === 'login'.
import LoginForm from './LoginForm.jsx'
// Import the sign-up form, shown when view === 'signup'.
import SignUpForm from './SignUpForm.jsx'

// Tabs as [id, label] pairs; the id is stored in `view` and the label is the button text.
const TABS = [['login', 'Log In'], ['signup', 'Sign Up']]

// Export the component as the default export; it receives no props.
export default function Auth() {
  // State: which screen is active; starts on 'login'; setView changes it and triggers a re-render.
  const [view, setView] = useState('login') // 'login' | 'signup' | 'forgot'
  // State: the email/username typed on the login form, remembered so the forgot form can pre-fill it.
  const [email, setEmail] = useState('') // carried between Log In and Forgot password
  // Ref that the child forms attach to their headings, so this component can move focus there.
  const headingRef = useRef(null)
  // Ref that remembers the previous value of `view` (starts as the current view); updating it does not re-render.
  const prevView = useRef(view)

  // Moving to/from the reset screen replaces the whole form, so send focus to its heading
  // to tell keyboard and screen-reader users where they are. Tab switches keep focus on the tab.
  // Register an effect that runs after render whenever `view` changes (see the dependency array).
  useEffect(() => {
    // Read the previous view from the ref.
    const from = prevView.current
    // Save the current view as the "previous" for next time.
    prevView.current = view
    // If the view really changed AND either the old or the new view is 'forgot', focus the heading (?. avoids an error if the ref is empty).
    if (from !== view && (from === 'forgot' || view === 'forgot')) headingRef.current?.focus()
  // Dependency array: run only when `view` changes.
  }, [view])

  // Return the JSX for the whole logged-out page.
  return (
    // Outer wrapper (same .wrap container class used in App.jsx).
    <div className="wrap">
      {/* Accessibility link that lets keyboard users jump to the main content. */}
      <a className="skip-link" href="#main">Skip to main content</a>

      {/* Narrow centred page container. */}
      <div className="auth-page">
        {/* Header with the brand. */}
        <header className="app-header">
          {/* Container for the title and tagline. */}
          <div>
            {/* Brand title with two coloured words. */}
            <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
            {/* Tagline. */}
            <p className="tag">cash register for startups</p>
          {/* Close the container div. */}
          </div>
        {/* Close the header. */}
        </header>

        {/* Grid that holds the form column and the benefits aside. */}
        <div className="auth-layout">
          {/* Main content area; id="main" is the skip link's target. */}
          <main id="main">
            {/* White card that holds the tabs and the active form. */}
            <div className="card auth-card">
              {/* Show the tabs only when NOT on the forgot-password screen. */}
              {view !== 'forgot' && (
                // Navigation for the two tabs; aria-label names it for screen readers.
                <nav className="tabs auth-tabs" aria-label="Account">
                  {/* .map() loops over TABS and destructures each pair; it returns one button per tab. */}
                  {TABS.map(([id, label]) => (
                    // key (the unique tab id) helps React track list items; aria-current marks the active tab; onClick sets the view state to this tab's id.
                    <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
                      {/* The tab's visible text. */}
                      {label}
                    {/* Close the button. */}
                    </button>
                  // Close the .map() call.
                  ))}
                {/* Close the nav. */}
                </nav>
              // Close the conditional expression.
              )}

              {/* Show the login form only in the 'login' view. */}
              {view === 'login' && (
                // Render LoginForm with the props below.
                <LoginForm
                  /* Pass the ref so LoginForm can attach it to its heading. */
                  headingRef={headingRef}
                  /* Pass the saved email as the starting value of its input. */
                  initialEmail={email}
                  /* Callback: LoginForm calls it with the typed text; we save that text in state and switch to the forgot view. */
                  onForgot={(typed) => { setEmail(typed); setView('forgot') }}
                /* Self-close LoginForm. */
                />
              // Close the conditional expression.
              )}
              {/* Show the sign-up form only in the 'signup' view; it only needs the heading ref. */}
              {view === 'signup' && <SignUpForm headingRef={headingRef} />}
              {/* Show the forgot-password form only in the 'forgot' view. */}
              {view === 'forgot' && (
                // Render ForgotPasswordForm with the props below.
                <ForgotPasswordForm
                  /* Ref for its heading, so focus can be moved there. */
                  headingRef={headingRef}
                  /* Pre-fill with the email typed on the login form. */
                  initialEmail={email}
                  /* Callback: switch the view back to the login form. */
                  onBack={() => setView('login')}
                /* Self-close ForgotPasswordForm. */
                />
              // Close the conditional expression.
              )}
            {/* Close the card. */}
            </div>

            {/* Small disclaimer below the card. */}
            <p className="note auth-note">
              {/* Disclaimer text. */}
              Accounts and data stay in this browser. This is a demo sign-in, so do not reuse a real password.
            {/* Close the paragraph. */}
            </p>
          {/* Close main. */}
          </main>

          {/* Benefits panel (hidden on small screens by CSS); aria-labelledby names it by the heading id. */}
          <aside className="card auth-aside" aria-labelledby="aside-title">
            {/* Panel heading. */}
            <h2 id="aside-title">Know where your cash stands</h2>
            {/* Panel description. */}
            <p>Record sales and expenses as they happen, then see your runway, break-even point and profit split.</p>
            {/* Static list of benefits (a check mark is added by CSS). */}
            <ul className="auth-benefits">
              {/* Benefit 1. */}
              <li>A quick register for sales and expenses</li>
              {/* Benefit 2. */}
              <li>Monthly insights in plain language</li>
              {/* Benefit 3. */}
              <li>Export every entry to CSV</li>
            {/* Close the list. */}
            </ul>
          {/* Close the aside. */}
          </aside>
        {/* Close the layout grid. */}
        </div>
      {/* Close the page container. */}
      </div>
    {/* Close the outer wrapper. */}
    </div>
  // Close the return parenthesis.
  )
// Close the component.
}