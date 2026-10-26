/**
 * FILE OVERVIEW: LoginForm.jsx
 *
 * WHAT IT DOES:
 *   The actual login form: an "Email or username" field, a password field with a
 *   show/hide toggle, a "Remember me" checkbox, a "Forgot password?" button and a
 *   submit button. It validates input, calls login() from the auth context, and shows
 *   errors and a loading state.
 *
 * WHERE IT FITS:
 *   A child of the Login.jsx page (inside the card in <main>). It uses TextField,
 *   PasswordField and Callout child components, and talks to the auth layer through
 *   the useAuth() hook and the AuthError class from utils/auth.js.
 *
 * REACT MECHANICS USED:
 *   - useState: `loading` (boolean, true while the login request runs) and `formError`
 *     (string, the message shown in the Callout)
 *   - Custom hook useForm(initialValues, validate, onChange): holds values, errors,
 *     touched fields; exposes values, errors, error(name), field(name), setValue, touchAll
 *   - Custom hook useFocusWhenIdle(loading): returns queueFocus(id), which focuses an
 *     element once loading has finished
 *   - useAuth(): supplies the login function
 *   - Props RECEIVED: headingRef (ref for the heading), initialEmail (starting email
 *     value), onForgot (callback run when "Forgot password?" is clicked)
 *   - Props PASSED DOWN: id, label, type, autoComplete, error, plus {...form.field(name)}
 *     (value/handlers) to TextField and PasswordField; kind and label to Callout
 *   - Array method: FIELDS.find(...) is used to get the FIRST invalid field name. It is
 *     .find, not .map or .filter, and it returns one item (or undefined), not a new array
 *   - NOTE: Login.jsx renders <LoginForm /> with no props, so initialEmail and onForgot
 *     are undefined there; clicking "Forgot password?" would call undefined(...)
 */

// Import the useState hook to hold local component state (loading and formError)
import { useState } from 'react'
// Import the Callout component used to display the form-level error message
import Callout from './Callout.jsx'
// Import PasswordField, an input with a show/hide toggle
import PasswordField from './PasswordField.jsx'
// Import TextField, a reusable labeled text input with error display
import TextField from './TextField.jsx'
// Import useAuth to get the login() function from the auth context
import { useAuth } from '../hooks/useAuth.js'
// Import two custom hooks: useFocusWhenIdle (focus after loading ends) and useForm (form values/errors/touched state)
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
// Import AuthError, the custom error class thrown by login for expected failures (e.g. wrong password)
import { AuthError } from '../utils/auth.js'
// Import the validators object containing reusable validation rules
import { validators } from '../utils/validation.js'

// Array of field names that the submit handler checks for errors, in the order they appear on screen
const FIELDS = ['email', 'password']

// Validation function passed to useForm; receives the current values object `v` and returns an object of error messages keyed by field name; the arrow's parentheses wrap the returned object literal
const validate = (v) => ({
  // Validate the email field with the identifier rule, which accepts either an email OR a username
  email: validators.identifier(v.email), // email OR username
  // Validate the password field with the loginPassword rule
  password: validators.loginPassword(v.password),
// Close the returned object and the arrow function
})

// Export the LoginForm component; it destructures three props: headingRef (ref for the heading), initialEmail (starting email) and onForgot (forgot-password callback)
export default function LoginForm({ headingRef, initialEmail, onForgot }) {
  // Pull the login function out of the auth context; calling it performs the sign-in
  const { login } = useAuth()
  // STATE: `loading` is false at first; setLoading(true) while the request runs; it disables the fieldset, shows the spinner, and blocks double submits
  const [loading, setLoading] = useState(false)
  // STATE: `formError` holds the form-level error text ('' means no error, so the Callout is hidden)
  const [formError, setFormError] = useState('')
  // Create the form manager: starting values, the validate function, and a callback that clears formError whenever a field changes (so a stale error disappears as the user types)
  const form = useForm({ email: initialEmail, password: '', remember: false }, validate, () => setFormError(''))
  // Get queueFocus, which schedules focusing an element by id once `loading` is no longer true (inputs inside a disabled fieldset cannot take focus)
  const queueFocus = useFocusWhenIdle(loading)

  // Submit handler: an async function so it can await the login call; it receives the form submit event `e`
  const submit = async (e) => {
    // Stop the browser's default form submission, which would reload the page
    e.preventDefault()
    // If a login request is already running, ignore this submit (prevents double submission)
    if (loading) return

    // ARRAY ITERATION: .find walks FIELDS ['email','password'] and returns the first name whose entry in form.errors is truthy (has an error message), or undefined if there are none
    const invalid = FIELDS.find((name) => form.errors[name])
    // If a field name was found, at least one field is invalid, so stop here instead of calling login
    if (invalid) {
      // Mark every field as touched so all of their error messages become visible
      form.touchAll()
      // Set the form-level error message so the Callout appears
      setFormError('Fix the highlighted fields, then try again.')
      // Move keyboard focus to the first invalid input, found by its id (login-email or login-password); ?. avoids a crash if the element is missing
      document.getElementById(`login-${invalid}`)?.focus()
      // Stop the submit handler without attempting login
      return
    // Close the if (invalid) block
    }

    // Clear any previous form-level error before trying again
    setFormError('')
    // Set loading to true, which re-renders the form in its busy state
    setLoading(true)
    // Start a try block so errors thrown by login can be caught
    try {
      // Wait for login to finish, sending the current email/username, password and remember-me choice from the form state
      await login({
        // Send the current email-or-username text
        email: form.values.email,
        // Send the current password text
        password: form.values.password,
        // Send whether "Remember me" is checked
        remember: form.values.remember,
      // Close the object passed to login and the call itself
      })
    // If login throws, run this catch block with the error in `err`
    } catch (err) {
      // If it is an expected AuthError, show its message; otherwise show a generic fallback message
      setFormError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      // Ask to focus the password input as soon as loading ends, so the user can retype it
      queueFocus('login-password')
    // The finally block always runs, whether login succeeded or failed
    } finally {
      // Turn loading off again so the form is usable and the button returns to normal
      setLoading(false)
    // Close the try/catch/finally statement
    }
  // Close the submit function
  }

  // Return the form JSX that React renders
  return (
    // The form element: onSubmit runs our handler; noValidate turns off the browser's built-in validation so our own messages are used; aria-labelledby names the form by the heading id
    <form onSubmit={submit} noValidate aria-labelledby="login-title">
      {/* Form heading; the ref lets a parent focus it, tabIndex={-1} makes it focusable by code but not by Tab */}
      <h2 id="login-title" ref={headingRef} tabIndex={-1} className="auth-title">Welcome back</h2>
      {/* Subtitle explaining the purpose of the form */}
      <p className="auth-sub">Log in to open your register and insights.</p>

      {/* Fieldset groups all controls; disabled={loading} disables every input and button inside it while the request runs */}
      <fieldset className="auth-fieldset" disabled={loading}>
        {/* TextField for the email or username; props are listed below, one per line */}
        <TextField
          // PROP: id lets the label link to the input and lets submit() find it with getElementById
          id="login-email"
          // PROP: visible label text
          label="Email or username"
          // PROP: plain text input, because the value may be a username, not only an email
          type="text"
          // PROP: tells browsers and password managers this is the username field
          autoComplete="username"
          // PROP: stops mobile keyboards from capitalising the first letter
          autoCapitalize="none"
          // PROP: turns off spell-check red underlines (spellCheck={false} is a JS boolean, so it uses braces)
          spellCheck={false}
          // PROP: grey hint text shown when the field is empty
          placeholder="you@example.com or username"
          // PROP: error message for this field (from useForm; probably only set once the field is touched), shown under the input
          error={form.error('email')}
          // SPREAD: form.field('email') returns the props that make this a controlled input (e.g. value, onChange, onBlur) so the input is tied to form state
          {...form.field('email')}
        // Self-closing end of the TextField element
        />

        {/* PasswordField: same idea as TextField but with a show/hide button */}
        <PasswordField
          // PROP: id for label linking and for focus by id in submit() and queueFocus()
          id="login-password"
          // PROP: label text (PasswordField also uses it to build the toggle button's aria-label)
          label="Password"
          // PROP: tells password managers this field holds the existing password
          autoComplete="current-password"
          // PROP: error message for the password field from useForm
          error={form.error('password')}
          // SPREAD: controlled-input props (value/onChange/etc.) for the password field; PasswordField forwards them to its inner <input> through ...inputProps
          {...form.field('password')}
        // Self-closing end of the PasswordField element
        />

        {/* Row containing the remember-me checkbox and the forgot-password button */}
        <div className="auth-row">
          {/* Label wrapping the checkbox so clicking the text toggles it */}
          <label className="check">
            {/* Checkbox input */}
            <input
              // This input is a checkbox
              type="checkbox"
              // CONTROLLED: checked comes from form state (form.values.remember), so React is the single source of truth
              checked={form.values.remember}
              // On change, write the new checked value (true/false) back into form state under the key 'remember'
              onChange={(e) => form.setValue('remember', e.target.checked)}
            // Self-closing end of the input
            />
            {/* Visible label text for the checkbox */}
            <span>Remember me</span>
          {/* Close the label */}
          </label>
          {/* Button styled as a link; type="button" stops it from submitting the form; on click it calls the parent's onForgot callback with the email typed so far */}
          <button type="button" className="link-btn" onClick={() => onForgot(form.values.email)}>
            {/* Button text */}
            Forgot password?
          {/* Close the button */}
          </button>
        {/* Close the row */}
        </div>

        {/* CONDITIONAL RENDER: if formError is a non-empty string, show a Callout (kind="bad" makes it an error style, label sets its heading) containing the message as children; if it is '' nothing is rendered */}
        {formError && <Callout kind="bad" label="Action needed">{formError}</Callout>}

        {/* Submit button: aria-busy tells assistive tech it is working while loading is true */}
        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {/* While loading, show a decorative spinner (hidden from screen readers); when not loading, this expression is false and renders nothing */}
          {loading && <span className="spinner" aria-hidden="true" />}
          {/* Button text switches with the loading state */}
          {loading ? 'Logging in…' : 'Log in'}
        {/* Close the submit button */}
        </button>
        {/* Screen-reader-only live region that announces "Logging in, please wait." while loading and nothing otherwise */}
        <span className="sr-only" role="status">{loading ? 'Logging in, please wait.' : ''}</span>
      {/* Close the fieldset */}
      </fieldset>
    {/* Close the form */}
    </form>
  // Close the parentheses around the returned JSX
  )
// Close the LoginForm function body
}