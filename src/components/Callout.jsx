/*
 * =============================================================================
 * FILE OVERVIEW: Callout.jsx (components/Callout.jsx)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * Callout is a tiny, reusable presentational component. It draws a coloured
 * message box (success, error, warning or info) with a bold text label on top
 * and the message below. It holds no state and no logic besides choosing an
 * accessibility role.
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   Imported by ChangeUsernameForm.jsx and ChangePasswordForm.jsx (and likely
 *   LoginForm, SignUpForm, ForgotPasswordForm). Each parent owns a `status`
 *   state ({ kind, text }) and renders <Callout> only when `status` is set.
 *   Styling comes from styles.css: .tip, .tip.good / .warn / .bad (the `kind`
 *   string becomes a class name), .tip-label, .auth-callout.
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 *   - PROPS (destructured in the parameter list):
 *       kind     : 'bad' | 'good' | 'warn' | 'info'. Default 'bad'. Picks the colour class and the ARIA role.
 *       label    : the short bold heading text (for example "Saved" or "Action needed").
 *       children : special prop = whatever JSX/text is nested between <Callout>...</Callout>.
 *   - Default parameter value (kind = 'bad'): used when the parent passes no kind.
 *   - String concatenation to build a className, and a ternary to pick the role.
 *   - No useState, no .map(), no .filter() in this file.
 *   - Defense note: kind 'info' is documented but has no .tip.info CSS rule in
 *     styles.css, so it would fall back to the default teal look. 'good' uses
 *     role="status" (polite announcement); every other kind uses role="alert"
 *     (assertive announcement).
 * =============================================================================
 */

// Original comment kept: explains the visual reuse and the allowed values of `kind`.
// Reuses the app's .tip look (colour + visible text label, never colour alone).
// Original comment kept: lists the allowed kinds.
// kind: 'bad' (error) | 'good' (success) | 'warn' | 'info'
// Export the component as this file's default export; the parameter destructures props: kind (default 'bad'), label, and children (nested content).
export default function Callout({ kind = 'bad', label, children }) {
  // Return JSX.
  return (
    // Wrapper div: className becomes e.g. "tip auth-callout good"; the role is 'status' for success (polite) and 'alert' for everything else (assertive), so screen readers announce it.
    <div className={'tip auth-callout ' + kind} role={kind === 'good' ? 'status' : 'alert'}>
      {/* The bold label prop shown in capitals by CSS, so meaning never depends on colour alone. */}
      <span className="tip-label">{label}</span>
      {/* children: the message text the parent nested inside <Callout>. */}
      {children}
    {/* Close the wrapper div. */}
    </div>
  // Close the return parenthesis.
  )
// Close the Callout function.
}