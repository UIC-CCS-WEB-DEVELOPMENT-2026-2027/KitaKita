/**
 * FILE OVERVIEW: PasswordField.jsx
 *
 * WHAT IT DOES:
 *   A reusable password input with a show/hide (eye) toggle button, a label, and
 *   an optional error or hint message. Children (e.g. a strength meter) render below.
 *
 * WHERE IT FITS:
 *   A shared form component. LoginForm.jsx uses it for the password field, and a
 *   signup form could reuse it. It is a "controlled" input from the parent's view:
 *   the parent passes value/onChange through ...inputProps.
 *
 * REACT MECHANICS USED:
 *   - useState: `shown` (boolean) decides if the input type is 'text' (visible) or 'password' (hidden)
 *   - Props RECEIVED: id, label, error, hint, children, and ...inputProps (rest props such as
 *     value, onChange, onBlur, autoComplete); rest props are forwarded straight to the <input>
 *   - Props/state used for accessibility: aria-invalid, aria-describedby, aria-pressed, aria-controls, aria-label
 *   - Conditional rendering with ternaries and `children` rendering
 *   - Icon components EyeIcon and EyeOffIcon chosen by the `shown` state
 *   - No .map() or .filter() in this file
 */

// Import useState to hold the show/hide toggle state
import { useState } from 'react'
// Import the two icon components used inside the toggle button
import { EyeIcon, EyeOffIcon } from './Icons.jsx'

// Password input with a show/hide toggle. `children` render under the message (e.g. strength meter).
// Export the component; the parameter destructures known props and gathers every other prop into the object `inputProps` using the rest operator
export default function PasswordField({ id, label, error, hint, children, ...inputProps }) {
  // STATE: `shown` starts false (password hidden); setShown flips it when the toggle button is clicked
  const [shown, setShown] = useState(false)
  // Work out the id of the message element that describes the input: the error id if there is an error, otherwise the hint id if there is a hint, otherwise undefined (so no aria-describedby is rendered)
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  // Return the JSX for this component
  return (
    // Wrapper div for one form field; "field" class gives the standard spacing
    <div className="field">
      {/* Label linked to the input through htmlFor, so clicking it focuses the input; its text comes from the `label` prop */}
      <label htmlFor={id}>{label}</label>
      {/* Wrapper holding the input and toggle button; the "is-invalid" class is added only when an error exists */}
      <div className={'pw-wrap' + (error ? ' is-invalid' : '')}>
        {/* The actual input element */}
        <input
          // id from props, matched by the label's htmlFor
          id={id}
          // STATE-DRIVEN: shows plain text when shown is true, hides characters when false
          type={shown ? 'text' : 'password'}
          // Stop mobile keyboards from auto-capitalising
          autoCapitalize="none"
          // Turn off spell-check underlines on a password
          spellCheck={false}
          // Tell assistive tech the field is invalid only when there is an error (undefined removes the attribute)
          aria-invalid={error ? 'true' : undefined}
          // Link the input to its error/hint message element for screen readers
          aria-describedby={messageId}
          // SPREAD: forward all remaining props from the parent (value, onChange, onBlur, autoComplete, ...) onto the input; because it comes last, it could override earlier attributes
          {...inputProps}
        // Self-closing end of the input element
        />
        {/* Toggle button that reveals or hides the password */}
        <button
          // type="button" prevents it from submitting the surrounding form
          type="button"
          // CSS class for toggle button styling
          className="pw-toggle"
          // Accessible name built from the label, e.g. "Show password"; note it does not change when shown flips (aria-pressed carries that state)
          aria-label={`Show ${label.toLowerCase()}`}
          // Tells assistive tech whether the toggle is currently "on" (password visible)
          aria-pressed={shown}
          // Says which element this button controls: the input with this id
          aria-controls={id}
          // Hover tooltip text that does change with state: offers "Hide" while shown and "Show" otherwise
          title={shown ? 'Hide password' : 'Show password'}
          // STATE UPDATE: functional update that flips the previous value (true to false or false to true), triggering a re-render
          onClick={() => setShown((s) => !s)}
        // End of the button's opening tag
        >
          {/* STATE-DRIVEN: show the crossed-out eye icon when the password is visible, otherwise the normal eye icon */}
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        {/* Close the button */}
        </button>
      {/* Close the pw-wrap div */}
      </div>
      {/* Nested ternary: if there is an error show an error paragraph; else if there is a hint show a hint paragraph; else render nothing */}
      {error ? (
        // Error message paragraph; its id (messageId) is the one aria-describedby points to
        <p id={messageId} className="field-error">{error}</p>
      // Else-branch: check for a hint
      ) : hint ? (
        // Hint paragraph, also using messageId as its id
        <p id={messageId} className="hint">{hint}</p>
      // Final else-branch: nothing to render (null renders nothing)
      ) : null}
      {/* Render any child elements the parent placed inside <PasswordField>...</PasswordField>, such as a strength meter */}
      {children}
    {/* Close the field wrapper div */}
    </div>
  // Close the parentheses around the returned JSX
  )
// Close the component function body
}