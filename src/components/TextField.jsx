/**
 * FILE OVERVIEW: TextField.jsx
 *
 * WHAT IT DOES:
 *   A reusable "label + input + message" form control. It shows a label, a text
 *   input, and under it either an error message (if there is one) or a hint.
 *
 * WHERE IT FITS:
 *   A shared building block used by LoginForm.jsx, SignUpForm.jsx and Settings.jsx
 *   (AccountForm). It keeps all of those forms consistent and accessible without
 *   repeating markup (component modularity). PasswordField.jsx is its sibling with a
 *   show/hide toggle.
 *
 * REACT MECHANICS USED:
 *   - Props RECEIVED: id, label, error, hint, plus ...inputProps (rest props: every other
 *     prop such as type, value, onChange, onBlur, placeholder, autoComplete)
 *   - Rest/spread: `...inputProps` collects the extras and {...inputProps} forwards them
 *     onto the <input>. Because the parent spreads form.field(name) (value/onChange),
 *     this is a controlled input whose state lives in the parent's useForm
 *   - Conditional rendering with a nested ternary (error, else hint, else nothing)
 *   - No useState, no .map() and no .filter() in this file
 */

// Label + input + inline message. The error replaces the hint while it is showing.
// Export the component; it destructures id, label, error and hint, and gathers all other props into the object inputProps using the rest operator
export default function TextField({ id, label, error, hint, ...inputProps }) {
  // Work out the id of the message paragraph: the error id if there is an error, else the hint id if there is a hint, else undefined (no aria-describedby)
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  // Return the JSX for the field
  return (
    // Wrapper div with the shared "field" class for spacing
    <div className="field">
      {/* Label tied to the input by htmlFor, so clicking the label focuses the input */}
      <label htmlFor={id}>{label}</label>
      {/* The input: id matches the label; aria-invalid is 'true' only when an error exists; aria-describedby links to the message paragraph; {...inputProps} forwards every remaining prop (type, value, onChange, etc.) and comes last so it can override earlier attributes */}
      <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={messageId} {...inputProps} />
      {/* Nested ternary: if there is an error render the error paragraph; else if there is a hint render the hint paragraph; else render nothing */}
      {error ? (
        // Error paragraph using messageId as its id
        <p id={messageId} className="field-error">{error}</p>
      // Else branch: check for a hint
      ) : hint ? (
        // Hint paragraph using messageId as its id
        <p id={messageId} className="hint">{hint}</p>
      // Final else: nothing to render
      ) : null}
    {/* Close the wrapper div */}
    </div>
  // Close the parentheses around the returned JSX
  )
// Close the component function body
}