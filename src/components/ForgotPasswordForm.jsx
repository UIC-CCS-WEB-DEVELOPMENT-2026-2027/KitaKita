/*
 * =============================================================================
 * FILE OVERVIEW: ForgotPasswordForm.jsx
 * =============================================================================
 * WHAT IT DOES:
 *   Renders the "Reset your password" form. The user types an email, and on
 *   submit the form validates it, asks the auth layer to send a reset link,
 *   and shows either a success message or an error message. It also manages
 *   a loading state, accessibility announcements and focus.
 *
 * WHERE IT FITS:
 *   It is one panel in the login/auth flow. A parent auth page (not shown here)
 *   decides when to display it, passes in an initial email, a heading ref and a
 *   way to go back to the login form. It calls the shared auth hook
 *   (useAuth) to do the real work, and uses the reusable form hook (useForm)
 *   and field components (TextField, Callout).
 *
 * PRIMARY REACT MECHANICS:
 *   - Props received:
 *       headingRef    a ref created by the parent, attached to the <h2> so the
 *                     parent can move keyboard focus here when the panel opens.
 *       initialEmail  pre-fills the email field (for example, what the user
 *                     already typed on the login form).
 *       onBack        a callback from the parent that switches back to login.
 *   - useState (3 variables):
 *       loading    true while the request is in flight.
 *       sentTo     the email the link was sent to (empty string means not sent).
 *       formError  an error message string (empty string means no error).
 *   - Custom hooks: useAuth (gives requestPasswordReset), useForm (values,
 *     errors, field wiring), useFocusWhenIdle (queues focus until the form is
 *     no longer disabled).
 *   - Async event handler with try / catch / finally.
 *   - Conditional rendering with && and ternaries.
 *   - No .map() or .filter() in this file.
 *   Note: the internals of useForm, useFocusWhenIdle, TextField and Callout
 *   live in other files, so their behaviour below is described from how this
 *   file uses them.
 * =============================================================================
 */

// Import the useState hook from React to store the loading, sentTo and formError values.
import { useState } from 'react'
// Import the reusable Callout component that displays coloured message boxes.
import Callout from './Callout.jsx'
// Import the reusable TextField component that renders a labelled input with an error message.
import TextField from './TextField.jsx'
// Import the custom auth hook that provides requestPasswordReset.
import { useAuth } from '../hooks/useAuth.js'
// Import two custom hooks: useFocusWhenIdle (deferred focusing) and useForm (form values and errors).
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
// Import the validators object containing reusable validation functions such as email.
import { validators } from '../utils/validation.js'

// Validation function passed to useForm: it takes all values v and returns an object of error messages keyed by field name.
const validate = (v) => ({ email: validators.email(v.email) })

// Declare and default-export the component; props are destructured: headingRef, initialEmail and onBack all come from the parent.
export default function ForgotPasswordForm({ headingRef, initialEmail, onBack }) {
  // Get the requestPasswordReset function from the auth hook; it is what actually asks the backend to send the email.
  const { requestPasswordReset } = useAuth()
  // State: loading starts false and flips to true while the reset request is running; setLoading updates it and triggers a re-render.
  const [loading, setLoading] = useState(false)
  // State: sentTo starts as an empty string; once the request succeeds it stores the email address so the success message can show it.
  const [sentTo, setSentTo] = useState('')
  // State: formError starts empty; it holds the error text shown if the request fails.
  const [formError, setFormError] = useState('')
  // Create the form helper: initial values come from the initialEmail prop, validate checks them, and the third argument is a callback (presumably run when a value changes) that clears any old form-level error.
  const form = useForm({ email: initialEmail }, validate, () => setFormError(''))
  // Get queueFocus, a function that remembers which element id to focus and does it once loading is false and the fieldset is no longer disabled.
  const queueFocus = useFocusWhenIdle(loading)

  // Submit handler: async because it waits for the network request; e is the form submit event.
  const submit = async (e) => {
    // Stop the browser's default form submission, which would reload the page.
    e.preventDefault()
    // Ignore the submit if a request is already running, which prevents double sends.
    if (loading) return

    // If the email field currently has a validation error, handle it instead of sending.
    if (form.errors.email) {
      // Mark every field as touched so the error messages become visible.
      form.touchAll()
      // Move keyboard focus to the email input (optional chaining ?. avoids a crash if the element is missing).
      document.getElementById('forgot-email')?.focus()
      // Stop here so no request is made with an invalid email.
      return
    // Close the validation if block.
    }

    // Clear any previous error message before trying again.
    setFormError('')
    // Clear any previous success message so old and new results do not show together.
    setSentTo('')
    // Turn on the loading state, which disables the fieldset and shows the spinner.
    setLoading(true)
    // Start a try block to catch failures from the async call.
    try {
      // Wait for the reset-link request to finish, passing the current email value from the form.
      await requestPasswordReset(form.values.email)
      // On success, store the trimmed email in state, which makes the success Callout appear.
      setSentTo(form.values.email.trim())
    // If the await above throws, run the catch block (the error variable is not needed, so it is omitted).
    } catch {
      // Show a generic failure message to the user.
      setFormError('We could not send the reset link. Please try again.')
      // Queue focus back on the email field; it will be focused once loading ends and the field is enabled again.
      queueFocus('forgot-email')
    // The finally block always runs, whether the request succeeded or failed.
    } finally {
      // Turn off the loading state so the form becomes usable again.
      setLoading(false)
    // Close the try, catch and finally statement.
    }
  // Close the submit function.
  }

  // Return the JSX for the form.
  return (
    // Form element: onSubmit uses our handler, noValidate turns off the browser's built-in validation bubbles (we use our own), and aria-labelledby names the form after its heading.
    <form onSubmit={submit} noValidate aria-labelledby="forgot-title">
      {/* Heading: the id matches aria-labelledby, ref={headingRef} lets the parent focus it, and tabIndex={-1} makes it focusable by code but not by the Tab key. */}
      <h2 id="forgot-title" ref={headingRef} tabIndex={-1} className="auth-title">Reset your password</h2>
      {/* Instruction paragraph for the user. */}
      <p className="auth-sub">Enter the email you signed up with and we will send a link to choose a new password.</p>

      {/* Fieldset groups the controls; disabled={loading} disables every input and button inside while a request is running. */}
      <fieldset className="auth-fieldset" disabled={loading}>
        {/* Reusable text field component; the props below configure the input. */}
        <TextField
          // Unique id, which the label connects to and which the submit handler uses to focus the field.
          id="forgot-email"
          // Visible label text.
          label="Email"
          // Input type email gives the right mobile keyboard and basic browser behaviour.
          type="email"
          // Hint for virtual keyboards to show the email layout.
          inputMode="email"
          // Lets the browser or password manager autofill the email.
          autoComplete="email"
          // Stops mobile keyboards from auto-capitalising the first letter.
          autoCapitalize="none"
          // Turns off spellcheck underlines on an email address.
          spellCheck={false}
          // Greyed example text shown when the field is empty.
          placeholder="you@example.com"
          // Pass the current error message (if any) for the email field so TextField can display it.
          error={form.error('email')}
          // Spread the props returned by form.field('email') (likely value, onChange and onBlur), which makes this a controlled input wired to the form state.
          {...form.field('email')}
        // Self-close the TextField element.
        />

        {/* Show the success message only if sentTo is a non-empty string (truthy); && renders the Callout, otherwise nothing. */}
        {sentTo && (
          // Success callout; kind="good" picks the green style and label gives its visible heading.
          <Callout kind="good" label="Check your email">
            {/* Wording is deliberately vague ("If an account exists") so the form does not reveal which emails are registered. */}
            If an account exists for {sentTo}, a reset link is on its way.
          {/* Close the success Callout. */}
          </Callout>
        // Close the conditional expression.
        )}
        {/* Show the error message only if formError is a non-empty string. */}
        {formError && <Callout kind="bad" label="Action needed">{formError}</Callout>}

        {/* Submit button; aria-busy tells assistive tech when the button is working. */}
        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {/* While loading, show a spinner span; aria-hidden hides this decorative element from screen readers. */}
          {loading && <span className="spinner" aria-hidden="true" />}
          {/* Button text via nested ternary: loading shows "Sending…", otherwise if sentTo is set show "Send again", otherwise "Send reset link". */}
          {loading ? 'Sending…' : sentTo ? 'Send again' : 'Send reset link'}
        {/* Close the button. */}
        </button>
        {/* Hidden live region (role="status") that screen readers announce when its text changes; it has text only while loading. */}
        <span className="sr-only" role="status">{loading ? 'Sending reset link, please wait.' : ''}</span>
      {/* Close the fieldset. */}
      </fieldset>

      {/* Wrapper for the back link. */}
      <div className="auth-back">
        {/* Button styled as a link; onClick={onBack} calls the parent-supplied callback to return to the login form. */}
        <button type="button" className="link-btn" onClick={onBack}>Back to log in</button>
      {/* Close the auth-back wrapper. */}
      </div>
    {/* Close the form. */}
    </form>
  // Close the parentheses that wrap the returned JSX.
  )
// Close the component function body.
}
