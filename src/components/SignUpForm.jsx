/**
 * FILE OVERVIEW: SignUpForm.jsx
 *
 * WHAT IT DOES:
 *   The "Create your account" form: full name, email, password (with a strength
 *   meter), confirm password, and a Terms & Conditions checkbox with an expandable
 *   Terms text. It validates input, calls signup() from the auth context, and shows
 *   field-level and form-level errors plus a loading state.
 *
 * WHERE IT FITS:
 *   The sign-up counterpart of LoginForm.jsx. Both use the same building blocks
 *   (TextField, PasswordField, Callout, useForm, useFocusWhenIdle, useAuth, AuthError),
 *   which is the component-modularity point to emphasise in a defense. It is
 *   rendered by an auth page that switches between login and sign-up.
 *
 * REACT MECHANICS USED:
 *   - useState: loading (boolean) and formError (string)
 *   - useForm(INITIAL, validate, onChange) for values/errors/touched; useFocusWhenIdle(loading)
 *   - Props RECEIVED: headingRef (ref the parent can use to focus the heading)
 *   - Props PASSED DOWN: id, label, type, autoComplete, placeholder, hint, error and
 *     the spread {...form.field(name)} to TextField/PasswordField; kind/label to Callout;
 *     password to StrengthMeter
 *   - children prop: <StrengthMeter /> is nested inside <PasswordField>...</PasswordField>
 *     and PasswordField renders it via {children}
 *   - Array methods: FIELDS.find(...) (first invalid field) and [1,2,3,4].map(...)
 *     inside StrengthMeter (builds 4 bar segments)
 *   - Conditional rendering: early return null, &&, ternaries
 *   - NOTE: StrengthMeter is defined in this file AND also exists as its own file
 *     (StrengthMeter.jsx) with identical code. This file uses its own local copy, so
 *     the separate file is a duplicate
 */

// Import useState to hold local state (loading and formError)
import { useState } from 'react'
// Import Callout to display the form-level error message
import Callout from './Callout.jsx'
// Import PasswordField, the password input with a show/hide toggle
import PasswordField from './PasswordField.jsx'
// Import TextField, the reusable labeled text input
import TextField from './TextField.jsx'
// Import useAuth to get the signup function from the auth context
import { useAuth } from '../hooks/useAuth.js'
// Import the custom form hooks: focus-after-loading and the form state manager
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
// Import AuthError, the class of expected auth failures (it may carry a `field` property)
import { AuthError } from '../utils/auth.js'
// Import passwordStrength (scores a password) and validators (validation rules)
import { passwordStrength, validators } from '../utils/validation.js'

// Array of field names checked on submit, in on-screen order
const FIELDS = ['name', 'email', 'password', 'confirm', 'terms']

// Starting values for the form: empty text fields and an unchecked terms box
const INITIAL = { name: '', email: '', password: '', confirm: '', terms: false }

// Validation function given to useForm; v is the current values object and the result is an error-message object keyed by field (parentheses wrap the returned object literal)
const validate = (v) => ({
  // Validate the full name
  name: validators.name(v.name),
  // Validate the email format
  email: validators.email(v.email),
  // Validate the new password; the email is passed in too so a password equal to the email is rejected
  password: validators.newPassword(v.password, v.email), // also rejects password === email
  // Check that confirm matches password
  confirm: validators.confirm(v.confirm, v.password),
  // Check that the terms box is ticked
  terms: validators.terms(v.terms),
// Close the returned object and the arrow function
})

// Small presentational component that shows a 4-segment password strength bar; it receives the password text as a prop
function StrengthMeter({ password }) {
  // If the password is empty, render nothing at all (returning null renders nothing)
  if (!password) return null
  // Ask the helper to score the password; it returns an object whose score (number) and label (text) we pull out
  const { score, label } = passwordStrength(password)
  // Return the meter JSX
  return (
    // Wrapper; data-level exposes the score so CSS can color the bar by level
    <div className="strength" data-level={score}>
      {/* Bar container, hidden from screen readers because the text label below says the same thing */}
      <div className="strength-bar" aria-hidden="true">
        {/* ARRAY ITERATION (.map): maps the fixed array [1,2,3,4] to four <i> segments; a segment gets the class 'on' when its number n is less than or equal to the score (so score 3 lights segments 1, 2 and 3); key={n} is the unique key */}
        {[1, 2, 3, 4].map((n) => <i key={n} className={n <= score ? 'on' : ''} />)}
      {/* Close the bar container */}
      </div>
      {/* Visible text label such as "Strength: Strong" */}
      <span className="strength-label">Strength: {label}</span>
    {/* Close the wrapper */}
    </div>
  // Close the parentheses around the returned JSX
  )
// Close the StrengthMeter function body
}

// Export the SignUpForm component; it destructures one prop, headingRef
export default function SignUpForm({ headingRef }) {
  // Get the signup function from the auth context
  const { signup } = useAuth()
  // STATE: loading is true while the signup request runs
  const [loading, setLoading] = useState(false)
  // STATE: formError is the form-level error text ('' means none)
  const [formError, setFormError] = useState('')
  // Create the form manager with the starting values, the validate function and a callback that clears formError whenever a field changes
  const form = useForm(INITIAL, validate, () => setFormError(''))
  // Get queueFocus, which focuses an element by id once loading has ended
  const queueFocus = useFocusWhenIdle(loading)
  // Pull the current values object out of the form for short access (values.password, values.terms, ...)
  const { values } = form

  // Async submit handler; e is the submit event
  const submit = async (e) => {
    // Prevent the default page-reloading submit
    e.preventDefault()
    // Ignore the submit if a signup request is already running
    if (loading) return

    // ARRAY ITERATION (.find): walks FIELDS in order and returns the first field name whose error in form.errors is truthy; undefined if everything is valid
    const invalid = FIELDS.find((name) => form.errors[name])
    // If a field name was found, at least one field is invalid
    if (invalid) {
      // Mark all fields as touched so all error messages show
      form.touchAll()
      // Show the form-level message
      setFormError('Fix the highlighted fields, then try again.')
      // Focus the first invalid input by id (signup-name, signup-email, signup-password, signup-confirm or signup-terms); ?. avoids a crash if not found
      document.getElementById(`signup-${invalid}`)?.focus()
      // Stop without calling signup
      return
    // Close the invalid block
    }

    // Clear any old form-level error
    setFormError('')
    // Turn loading on (disables the fieldset and shows the spinner)
    setLoading(true)
    // Start a try block to catch errors from signup
    try {
      // Wait for signup to finish, sending only name, email and password (confirm and terms are not sent)
      await signup({ name: values.name, email: values.email, password: values.password })
    // Run this if signup throws
    } catch (err) {
      // If it is an expected AuthError
      if (err instanceof AuthError) {
        // Show its message in the Callout
        setFormError(err.message)
        // If the error says the problem is the email field
        if (err.field === 'email') {
          // Attach a message to the email field so it appears under that input
          form.setServerError('email', 'This email is already registered.')
          // Focus the email input once loading finishes
          queueFocus('signup-email')
        // Else if the error is about the password field
        } else if (err.field === 'password') {
          // Attach the server's message to the password field
          form.setServerError('password', err.message)
          // Focus the password input once loading finishes
          queueFocus('signup-password')
        // Close the field checks
        }
      // Otherwise it is an unexpected error
      } else {
        // Show a generic fallback message
        setFormError('Something went wrong. Please try again.')
      // Close the AuthError if/else
      }
    // The finally block always runs
    } finally {
      // Turn loading off whether signup worked or failed
      setLoading(false)
    // Close try/catch/finally
    }
  // Close the submit function
  }

  // Get the terms field error (undefined or '' when fine) once, to reuse in several places below
  const termsError = form.error('terms')

  // Return the form JSX
  return (
    // Form element: our submit handler, browser validation off, named by the heading with id "signup-title"
    <form onSubmit={submit} noValidate aria-labelledby="signup-title">
      {/* Heading; the ref lets a parent focus it and tabIndex={-1} makes it focusable by code but not via Tab */}
      <h2 id="signup-title" ref={headingRef} tabIndex={-1} className="auth-title">Create your account</h2>
      {/* Subtitle explaining the purpose */}
      <p className="auth-sub">Your register, insights and history are kept per account.</p>

      {/* Fieldset groups all controls; disabled={loading} disables them all while the request runs */}
      <fieldset className="auth-fieldset" disabled={loading}>
        {/* Full name field */}
        <TextField
          // PROP: id of the input (used by the label and by the submit() focus logic)
          id="signup-name"
          // PROP: visible label
          label="Full name"
          // PROP: browser autofill hint for the name
          autoComplete="name"
          // PROP: grey example text
          placeholder="Juan dela Cruz"
          // PROP: this field's error message from the form manager
          error={form.error('name')}
          // SPREAD: controlled-input props (value, onChange, onBlur) for 'name'
          {...form.field('name')}
        // Self-closing end of TextField
        />

        {/* Email field */}
        <TextField
          // PROP: id of the input
          id="signup-email"
          // PROP: visible label
          label="Email"
          // PROP: email input type (browser keyboard and format hints)
          type="email"
          // PROP: mobile keyboard hint for email entry
          inputMode="email"
          // PROP: browser autofill hint for email
          autoComplete="email"
          // PROP: stop auto-capitalisation
          autoCapitalize="none"
          // PROP: turn off spell-check underlines
          spellCheck={false}
          // PROP: grey example text
          placeholder="you@example.com"
          // PROP: this field's error message
          error={form.error('email')}
          // SPREAD: controlled-input props for 'email'
          {...form.field('email')}
        // Self-closing end of TextField
        />

        {/* Password field; it is NOT self-closing because it has a child (the strength meter) */}
        <PasswordField
          // PROP: id of the input
          id="signup-password"
          // PROP: visible label
          label="Password"
          // PROP: tells password managers this is a new password
          autoComplete="new-password"
          // PROP: help text shown when there is no error
          hint="At least 8 characters."
          // PROP: this field's error message
          error={form.error('password')}
          // SPREAD: controlled-input props for 'password'
          {...form.field('password')}
        // End of the opening tag; children follow
        >
          {/* CHILDREN: this element becomes PasswordField's `children` prop and is rendered under the message; state flows down by passing the current password text as a prop */}
          <StrengthMeter password={values.password} />
        {/* Close PasswordField */}
        </PasswordField>

        {/* Confirm password field */}
        <PasswordField
          // PROP: id of the input
          id="signup-confirm"
          // PROP: visible label
          label="Confirm password"
          // PROP: tells password managers this is a new password
          autoComplete="new-password"
          // PROP: shows "Passwords match." when something was typed and there is no confirm error; otherwise undefined (no hint)
          hint={values.confirm && !form.errors.confirm ? 'Passwords match.' : undefined}
          // PROP: this field's error message
          error={form.error('confirm')}
          // SPREAD: controlled-input props for 'confirm'
          {...form.field('confirm')}
        // Self-closing end of PasswordField
        />

        {/* Wrapper for the terms checkbox and its extras */}
        <div className="field">
          {/* Label wrapping the checkbox; htmlFor ties it to the input id */}
          <label className="check" htmlFor="signup-terms">
            {/* The checkbox input */}
            <input
              // id matches the label's htmlFor and the focus logic in submit()
              id="signup-terms"
              // This input is a checkbox
              type="checkbox"
              // CONTROLLED: checked comes from form state values.terms (true/false)
              checked={values.terms}
              // Mark invalid for assistive tech only when there is a terms error
              aria-invalid={termsError ? 'true' : undefined}
              // Point to the error paragraph by id only when there is a terms error
              aria-describedby={termsError ? 'signup-terms-error' : undefined}
              // On change, run the function below with the change event e
              onChange={(e) => {
                // Write the new checked value (true/false) into form state
                form.setValue('terms', e.target.checked)
                // Mark the terms field as touched so its error (if any) can show immediately
                form.touch('terms')
              // Close the onChange function
              }}
            // Self-closing end of the input
            />
            {/* Visible checkbox text; &amp; is the HTML-safe way to write & */}
            <span>I agree to the Terms &amp; Conditions.</span>
          {/* Close the label */}
          </label>
          {/* CONDITIONAL RENDER: show the terms error paragraph only if an error exists */}
          {termsError && <p id="signup-terms-error" className="field-error">{termsError}</p>}
          {/* Native expandable disclosure element for reading the terms */}
          <details className="chart-details terms-details">
            {/* Always-visible clickable heading of the disclosure */}
            <summary>Read the Terms &amp; Conditions</summary>
            {/* Scrollable text area; tabIndex={0} lets keyboard users focus it to scroll, and role="region" with a label makes it a named landmark */}
            <div className="terms-body" tabIndex={0} role="region" aria-label="Terms and Conditions">
              {/* Terms paragraph 1: what the app is */}
              <p>Kita Kita is a simple cash register and planning aid for small businesses. It is provided as is, without warranties.</p>
              {/* Terms paragraph 2: guidance disclaimer */}
              <p>The guidance it shows is based only on the numbers you enter. It is a starting point, not financial, legal or tax advice.</p>
              {/* Terms paragraph 3: data storage and backups */}
              <p>Your entries are stored in this browser. You are responsible for keeping backups, for example with Export CSV.</p>
              {/* Terms paragraph 4: acceptable use */}
              <p>Do not enter information you are not allowed to store, and do not reuse a password from another service.</p>
            {/* Close the terms body */}
            </div>
          {/* Close the details element */}
          </details>
        {/* Close the terms wrapper */}
        </div>

        {/* CONDITIONAL RENDER: show the error Callout only when formError is non-empty; kind and label are props, the message is passed as children */}
        {formError && <Callout kind="bad" label="Action needed">{formError}</Callout>}

        {/* Submit button; aria-busy tells assistive tech it is working while loading is true */}
        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {/* While loading show a decorative spinner; otherwise `false` renders nothing */}
          {loading && <span className="spinner" aria-hidden="true" />}
          {/* Button text changes with loading state */}
          {loading ? 'Creating account…' : 'Create account'}
        {/* Close the submit button */}
        </button>
        {/* Screen-reader-only live status announcing progress while loading */}
        <span className="sr-only" role="status">{loading ? 'Creating your account, please wait.' : ''}</span>
      {/* Close the fieldset */}
      </fieldset>
    {/* Close the form */}
    </form>
  // Close the parentheses around the returned JSX
  )
// Close the SignUpForm function body
}