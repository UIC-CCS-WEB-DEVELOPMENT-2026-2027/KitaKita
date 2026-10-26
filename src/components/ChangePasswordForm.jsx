/*
 * =============================================================================
 * FILE OVERVIEW: ChangePasswordForm.jsx (components/ChangePasswordForm.jsx)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * A form card where the signed-in user changes their password. It has three
 * fields (current password, new password with a strength meter, confirm), uses
 * useForm for values/validation/touched state, submits through an async auth
 * action, shows a spinner while saving, and shows a success/error Callout.
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   Likely rendered in Settings.jsx beside ChangeUsernameForm.
 *   Uses: useAuth (changePassword), useForm + useFocusWhenIdle, validators,
 *   AuthError, and the components Callout, PasswordField, StrengthMeter.
 *   Props received: NONE. Props passed down: id, label, autoComplete, hint,
 *   error, {...form.field()} to PasswordField; `password` to StrengthMeter;
 *   kind/label/children to Callout. PasswordField receives StrengthMeter as
 *   its `children` (nested inside the tags).
 *
 * !! DEFENSE WARNING (code is NOT changed) !!
 *   1. `changePassword` from useAuth(): the AuthContext.jsx you shared provides
 *      updateAccount (which can change the password), not changePassword.
 *   2. `form.reset()`: the useForm.js you shared returns no `reset` function.
 *   Both would crash at runtime in the shared versions. Verify before your defense.
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 * STATE (useState):
 *   - loading : true while saving.
 *   - status  : null | { kind, text } for the Callout.
 *   - (form values/touched/serverErrors live inside useForm.)
 * VALIDATE FUNCTION DEFINED OUTSIDE THE COMPONENT:
 *   - `validate` is a module-level constant, so its identity never changes and
 *     useForm's useMemo recalculates errors only when `values` changes. (The
 *     username form needed useCallback because it depends on `user.username`.)
 * ARRAY METHOD:
 *   - FIELDS.find(...) returns the first invalid field name; IDS[invalid] maps it to a DOM id.
 * CHILDREN PROP:
 *   - <PasswordField ...><StrengthMeter .../></PasswordField>: StrengthMeter is passed as children.
 * =============================================================================
 */

// Import useState from React to hold the loading flag and the status message.
import { useState } from 'react'
// Import Callout, the success/error message box.
import Callout from './Callout.jsx'
// Import PasswordField, a password input with a show/hide button.
import PasswordField from './PasswordField.jsx'
// Import StrengthMeter, the bar that shows how strong the new password is.
import StrengthMeter from './StrengthMeter.jsx'
// Import useAuth to read the auth actions from context.
import { useAuth } from '../hooks/useAuth.js'
// Import the two form hooks.
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
// Import AuthError to recognise expected errors in the catch block.
import { AuthError } from '../utils/auth.js'
// Import the validator functions.
import { validators } from '../utils/validation.js'

// Field names in the order they are checked; the first with an error gets focus.
const FIELDS = ['newPassword', 'confirm', 'currentPassword']
// Lookup object that maps each field name to the id of its DOM input (used for focusing).
const IDS = { newPassword: 'pw-new', confirm: 'pw-confirm', currentPassword: 'pw-current' }
// Starting values for useForm: all three inputs empty.
const INITIAL = { currentPassword: '', newPassword: '', confirm: '' }

// Module-level validate function: receives the values `v`, returns an object of error messages (or '').
const validate = (v) => ({
  // The current password must be non-empty.
  currentPassword: validators.currentPassword(v.currentPassword),
  // The new password must pass the length rule (no email argument here, so the "equals email" rule is skipped client-side).
  newPassword: validators.newPassword(v.newPassword),
  // The confirmation must be non-empty and equal to the new password (second argument).
  confirm: validators.confirm(v.confirm, v.newPassword),
// Close the returned object.
})

// Export the component; it has no props.
export default function ChangePasswordForm() {
  // Read the changePassword action from the auth context.
  const { changePassword } = useAuth()
  // State: true while the save runs.
  const [loading, setLoading] = useState(false)
  // State: message to show after submit; null means none.
  const [status, setStatus] = useState(null) // { kind: 'good' | 'bad', text }
  // Create the form helper; the third argument clears the status message whenever the user edits any field.
  const form = useForm(INITIAL, validate, () => setStatus(null))
  // Get the function that requests focus on a field once the form is idle again.
  const queueFocus = useFocusWhenIdle(loading)
  // Destructure `values` from the form helper for shorter access below.
  const { values } = form

  // Define the async submit handler.
  const submit = async (e) => {
    // Prevent the browser from reloading the page.
    e.preventDefault()
    // Ignore the click if a save is already running.
    if (loading) return

    // .find() returns the first field name with a non-empty error, or undefined.
    const invalid = FIELDS.find((name) => form.errors[name])
    // If there is a validation problem, do not submit.
    if (invalid) {
      // Make all errors visible.
      form.touchAll()
      // Show a general message.
      setStatus({ kind: 'bad', text: 'Fix the highlighted fields, then try again.' })
      // Look up the input id for the invalid field and focus it.
      document.getElementById(IDS[invalid])?.focus()
      // Stop here.
      return
    // Close the invalid block.
    }

    // Clear any old message.
    setStatus(null)
    // Start the loading state.
    setLoading(true)
    // Begin try: the action may throw.
    try {
      // Wait for the auth action, sending the typed current and new passwords.
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      // Clear the form after success.
      form.reset()
      // Show the success message.
      setStatus({ kind: 'good', text: 'Password changed. Your old password no longer works.' })
    // Catch any thrown error.
    } catch (err) {
      // Show an error message: the AuthError's own message if it is one, else a generic text.
      setStatus({
        // Red/alert style.
        kind: 'bad',
        // Ternary picks the message text.
        text: err instanceof AuthError ? err.message : 'Something went wrong. Please try again.',
      // Close the status object.
      })
      // Request focus: on the new-password input if the error belongs to it, otherwise on the current-password input.
      queueFocus(err instanceof AuthError && err.field === 'newPassword' ? 'pw-new' : 'pw-current')
    // Always run after try/catch.
    } finally {
      // Turn loading off so the form re-enables and the queued focus can happen.
      setLoading(false)
    // Close the try/catch/finally.
    }
  // Close submit.
  }

  // Return the JSX.
  return (
    // Card-styled form; onSubmit runs submit; noValidate uses our own validation; aria-labelledby points at the heading id.
    <form className="card" onSubmit={submit} noValidate aria-labelledby="pw-title">
      {/* Heading (its id is referenced above). */}
      <h2 id="pw-title">Change password</h2>
      {/* Short instruction text (matches MIN_PASSWORD = 8 in validation.js, but typed by hand here). */}
      <p className="auth-sub">Use at least 8 characters.</p>

      {/* Fieldset disabled while loading, which locks all the inputs. */}
      <fieldset className="auth-fieldset" disabled={loading}>
        {/* Current password field. */}
        <PasswordField
          /* id for label linking and focusing. */
          id="pw-current"
          /* Label text. */
          label="Current password"
          /* Autofill hint: existing password. */
          autoComplete="current-password"
          /* Visible error message or ''. */
          error={form.error('currentPassword')}
          /* Spread value, onChange, onBlur. */
          {...form.field('currentPassword')}
        /* Close the opening tag; this field has no children. */
        />

        {/* New password field; it has children (the strength meter) nested inside it. */}
        <PasswordField
          /* id for label linking and focusing. */
          id="pw-new"
          /* Label text. */
          label="New password"
          /* Autofill hint: a new password (managers may suggest a strong one). */
          autoComplete="new-password"
          /* Visible error message or ''. */
          error={form.error('newPassword')}
          /* Spread value, onChange, onBlur. */
          {...form.field('newPassword')}
        /* Close the opening tag. */
        >
          {/* StrengthMeter receives the typed new password as its `password` prop and presumably calls passwordStrength() to draw the bars. */}
          <StrengthMeter password={values.newPassword} />
        {/* Close the PasswordField. */}
        </PasswordField>

        {/* Confirm password field. */}
        <PasswordField
          /* id for label linking and focusing. */
          id="pw-confirm"
          /* Label text. */
          label="Confirm new password"
          /* Autofill hint. */
          autoComplete="new-password"
          /* Show the "Passwords match." hint only when something is typed AND there is no confirm error; otherwise undefined (no hint). */
          hint={values.confirm && !form.errors.confirm ? 'Passwords match.' : undefined}
          /* Visible error message or ''. */
          error={form.error('confirm')}
          /* Spread value, onChange, onBlur. */
          {...form.field('confirm')}
        /* Self-close. */
        />

        {/* Show the Callout only when there is a status message. */}
        {status && (
          // Pass kind, a ternary-chosen label, and the message as children.
          <Callout kind={status.kind} label={status.kind === 'good' ? 'Saved' : 'Action needed'}>
            {/* Message text (children prop). */}
            {status.text}
          {/* Close the Callout. */}
          </Callout>
        // Close the conditional expression.
        )}

        {/* Submit button with aria-busy tied to loading. */}
        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {/* Spinner only while loading. */}
          {loading && <span className="spinner" aria-hidden="true" />}
          {/* Button text changes with loading. */}
          {loading ? 'Saving…' : 'Save password'}
        {/* Close the button. */}
        </button>
        {/* Screen-reader-only live status text. */}
        <span className="sr-only" role="status">{loading ? 'Saving your password, please wait.' : ''}</span>
      {/* Close the fieldset. */}
      </fieldset>
    {/* Close the form. */}
    </form>
  // Close the return parenthesis.
  )
// Close the component.
}