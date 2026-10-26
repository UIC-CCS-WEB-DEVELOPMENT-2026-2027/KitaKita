/**
 * FILE OVERVIEW: StrengthMeter.jsx
 *
 * WHAT IT DOES:
 *   A small presentational component that displays a 4-segment bar and a text label
 *   showing how strong a typed password is.
 *
 * WHERE IT FITS:
 *   A reusable child component for password forms. In the code shown, SignUpForm.jsx
 *   defines its own identical copy of StrengthMeter and uses that, so this separate
 *   file is a duplicate that is not imported by SignUpForm.jsx. In a defense, say
 *   which one is used (the local copy) and that this file could replace it to avoid duplication.
 *
 * REACT MECHANICS USED:
 *   - Props RECEIVED: password (string). State flows DOWN: the parent holds the
 *     password in its form state and passes the current value in here
 *   - No useState: everything is derived from the prop on each render
 *   - Early return null for an empty password (renders nothing)
 *   - Array iteration: [1, 2, 3, 4].map(...) builds four bar segments, and each segment
 *     is switched on when its number is <= the score (with a key)
 *   - Data attribute data-level={score} for CSS styling
 *   - No .filter() in this file
 */

// Import passwordStrength, the helper that turns a password string into { score, label }
import { passwordStrength } from '../utils/validation.js'

// Export the component as default; it destructures one prop, password
export default function StrengthMeter({ password }) {
  // If the password is empty, render nothing (null means "render no output")
  if (!password) return null
  // Call the helper with the password; it returns an object and we pull out score (a number, used as a count of lit segments) and label (display text)
  const { score, label } = passwordStrength(password)
  // Return the meter JSX
  return (
    // Wrapper; data-level exposes the score so CSS can color the meter by level
    <div className="strength" data-level={score}>
      {/* Bar container, hidden from screen readers since the text label carries the same information */}
      <div className="strength-bar" aria-hidden="true">
        {/* ARRAY ITERATION (.map): the fixed array [1,2,3,4] becomes four <i> elements; each gets the class 'on' when its number n is <= score (so a score of 2 lights the first two); key={n} gives each segment a unique identity */}
        {[1, 2, 3, 4].map((n) => <i key={n} className={n <= score ? 'on' : ''} />)}
      {/* Close the bar container */}
      </div>
      {/* Visible text label such as "Strength: Weak" */}
      <span className="strength-label">Strength: {label}</span>
    {/* Close the wrapper */}
    </div>
  // Close the parentheses around the returned JSX
  )
// Close the component function body
}