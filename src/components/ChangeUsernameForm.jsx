/*
 * =============================================================================
 * FILE OVERVIEW: ChangeUsernameForm.jsx (components/ChangeUsernameForm.jsx)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * A form card where the signed-in user changes their username. It collects the
 * new username and the current password, validates them as you type (errors
 * appear after a field is touched), submits through an async function from the
 * auth context, shows a loading spinner while "saving", and shows a success or
 * error Callout afterwards. It also moves keyboard focus to the field that needs fixing.
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   Likely rendered inside the Settings panel (Settings.jsx) next to ChangePasswordForm.
 *   Uses:  useAuth()       -> { user, changeUsername } from AuthContext
 *          useForm()       -> values / errors / touched logic (hooks/useForm.js)
 *          useFocusWhenIdle-> delayed focus after a failed submit
 *          validators      -> validation.js rules
 *          AuthError       -> custom error class from utils/auth.js
 *          Callout, PasswordField, TextField -> reusable UI components
 *   Props received: NONE. It reads everything from hooks.
 *   Props passed down: id, label, autoComplete, autoCapitalize, spellCheck, error
 *   and the spread {...form.field(name)} (value, onChange, onBlur) into TextField
 *   and PasswordField; kind, label and children into Callout.
 *
 * !! DEFENSE WARNING: THINGS THIS FILE USES THAT I COULD NOT FIND IN THE FILES YOU SHARED !!
 *   (Code is NOT changed here. Verify these before your defense.)
 *   1. `changeUsername` from useAuth(): the AuthContext.jsx you shared provides
 *      updateAccount, not changeUsername. If the real file lacks it, the call fails
 *      with "changeUsername is not a function".
 *   2. `validators.newUsername(...)`: validation.js has `username`, not `newUsername`.
 *   3. `form.reset()`: useForm.js returns no `reset` function.
 *   These suggest this file belongs to an older/newer version than the other files.
 *   Check the project for the matching versions.
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 * STATE (useState):
 *   - loading : boolean; true while the fake request runs. Disables the fieldset, shows the spinner.
 *   - status  : null | { kind: 'good' | 'bad', text }; the message shown in the Callout.
 *   - (form values / touched / serverErrors live INSIDE useForm, as its own useState slots.)
 * MEMOISATION (useCallback):
 *   - validate is wrapped in useCallback with [user.username], so useForm's
 *     useMemo does not recompute errors on every render (the function identity is stable).
 * ARRAY METHOD:
 *   - FIELDS.find((name) => form.errors[name]) returns the FIRST field name that has
 *     an error (or undefined) so the form can focus it.
 * CONDITIONAL RENDERING:
 *   - {status && <Callout/>}, {loading && <span spinner/>}, ternaries for text.
 * PROP SPREADING:
 *   - {...form.field('newUsername')} expands to value, onChange, onBlur props (controlled input).
 * =============================================================================
 */

// Import useCallback (keep a stable function) and useState (hold changing data) from React.
import { useCallback, useState } from 'react'
// Import the Callout component, used to show the success/error message.
import Callout from './Callout.jsx'
// Import PasswordField, a password input with a show/hide button.
import PasswordField from './PasswordField.jsx'
// Import TextField, a labelled text input with an error line.
import TextField from './TextField.jsx'
// Import the useAuth hook, which reads the auth context (user and actions).
import { useAuth } from '../hooks/useAuth.js'
// Import both form hooks: useFocusWhenIdle (delayed focus) and useForm (form state helper).
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
// Import the AuthError class so catch blocks can recognise expected errors with instanceof.
import { AuthError } from '../utils/auth.js'
// Import the validators object whose functions return an error message or ''.
import { validators } from '../utils/validation.js'

// Module-level array of the form's field names, in the order they should be checked for errors (used with .find()).
const FIELDS = ['newUsername', 'currentPassword']
// Starting values for useForm: both inputs begin empty.
const INITIAL = { newUsername: '', currentPassword: '' }

// Export the component; it takes no props (everything comes from hooks).
export default function ChangeUsernameForm() {
  // Read the signed-in `user` and the changeUsername action from the auth context.
  const { user, changeUsername } = useAuth()
  // State: true while the save request is running; starts false.
  const [loading, setLoading] = useState(false)
  // State: the message to show after submit (null = none); the shape is { kind, text }.
  const [status, setStatus] = useState(null) // { kind: 'good' | 'bad', text }
  // Create the validate function once per username change (useCallback), so useForm can cache errors correctly.
  const validate = useCallback(
    // The function receives the current values object `v` and returns an errors object; the parentheses make the braces an object literal.
    (v) => ({
      // Validate the new username (the second argument is the current username, so the rule can compare them).
      newUsername: validators.newUsername(v.newUsername, user.username),
      // Validate that the current password was typed.
      currentPassword: validators.currentPassword(v.currentPassword),
    // Close the returned object and the arrow function.
    }),
    // Dependency array: rebuild validate only when the user's current username changes.
    [user.username]
  // Close the useCallback call.
  )
  // Create the form helper: initial values, the validate function, and an onEdit callback that clears the status message whenever the user edits a field.
  const form = useForm(INITIAL, validate, () => setStatus(null))
  // Get a function used to REQUEST focus on a field id; the actual focusing waits until `loading` becomes false.
  const queueFocus = useFocusWhenIdle(loading)

  // Define the async submit handler; `e` is the form submit event.
  const submit = async (e) => {
    // Stop the browser's default form submission (which would reload the page).
    e.preventDefault()
    // Ignore a second submit while a request is already running.
    if (loading) return

    // .find() returns the first field name whose error message is non-empty (truthy), or undefined if all are valid.
    const invalid = FIELDS.find((name) => form.errors[name])
    // If some field is invalid, show problems instead of submitting.
    if (invalid) {
      // Mark every field as touched so all error messages become visible.
      form.touchAll()
      // Show a general error message in the Callout.
      setStatus({ kind: 'bad', text: 'Fix the highlighted fields, then try again.' })
      // Focus the first invalid input by its id (ternary picks the id); ?. avoids an error if the element is missing.
      document.getElementById(invalid === 'newUsername' ? 'un-new' : 'un-current')?.focus()
      // Stop here: do not submit.
      return
    // Close the invalid block.
    }

    // Clear any old message before the new attempt.
    setStatus(null)
    // Turn on the loading state (disables the fieldset and shows the spinner).
    setLoading(true)
    // Begin try: the request may throw an AuthError.
    try {
      // Wait for the auth action to finish; it returns the updated public user.
      const updated = await changeUsername({
        // Send the typed current password (proof of identity).
        currentPassword: form.values.currentPassword,
        // Send the requested new username.
        newUsername: form.values.newUsername,
      // Close the argument object and the call.
      })
      // Clear the form fields after success.
      form.reset()
      // Show a success message; the template literal inserts the new username returned by the action.
      setStatus({ kind: 'good', text: `Username changed to ${updated.username}. Use it the next time you log in.` })
    // Catch any error thrown above.
    } catch (err) {
      // If it is an expected AuthError, use its message; otherwise use a generic one (instanceof checks the error type).
      const message = err instanceof AuthError ? err.message : 'Something went wrong. Please try again.'
      // Show the error message in the Callout.
      setStatus({ kind: 'bad', text: message })
      // If the error belongs to the username field specifically...
      if (err instanceof AuthError && err.field === 'newUsername') {
        // ...attach the message to that input as a server error so it shows under the field.
        form.setServerError('newUsername', message)
        // Request focus on the new-username input (it happens once the form is no longer busy).
        queueFocus('un-new')
      // Otherwise (wrong password or another error)...
      } else {
        // ...request focus on the current-password input.
        queueFocus('un-current')
      // Close the if/else.
      }
    // Always run this block, whether the try succeeded or failed.
    } finally {
      // Turn the loading state off, which re-enables the form and lets the queued focus happen.
      setLoading(false)
    // Close the try/catch/finally.
    }
  // Close the submit function.
  }

  // Return the JSX.
  return (
    // Form element styled as a card; onSubmit runs `submit`; noValidate turns off the browser's own bubbles (our validators handle it); aria-labelledby names the form by the heading id.
    <form className="card" onSubmit={submit} noValidate aria-labelledby="un-title">
      {/* Heading whose id matches aria-labelledby above. */}
      <h2 id="un-title">Change username</h2>
      {/* Subtitle showing the current username from context (user.username). */}
      <p className="auth-sub">You are signed in as <strong>{user.username}</strong>.</p>

      {/* Fieldset groups the controls; the disabled attribute follows the `loading` state, so all inputs lock while saving. */}
      <fieldset className="auth-fieldset" disabled={loading}>
        {/* TextField component for the new username; the props below configure it. */}
        <TextField
          /* id links the label to the input and is the target of getElementById focusing. */
          id="un-new"
          /* Label text shown above the input. */
          label="New username"
          /* Tell browsers not to autofill this field. */
          autoComplete="off"
          /* Do not auto-capitalise on mobile keyboards. */
          autoCapitalize="none"
          /* Turn off spell checking (usernames are not words). */
          spellCheck={false}
          /* error: the message to display, or '' (shown only after touch, or when set by the server). */
          error={form.error('newUsername')}
          /* Spread value, onChange and onBlur from useForm so the input is controlled by state. */
          {...form.field('newUsername')}
        /* Self-close the TextField. */
        />

        {/* PasswordField component for the current password. */}
        <PasswordField
          /* id for label linking and focusing. */
          id="un-current"
          /* Label text. */
          label="Current password"
          /* Hint to password managers that this is the existing password. */
          autoComplete="current-password"
          /* Visible error message, or ''. */
          error={form.error('currentPassword')}
          /* Spread value, onChange, onBlur for this field. */
          {...form.field('currentPassword')}
        /* Self-close the PasswordField. */
        />

        {/* Conditional rendering: show the Callout only when status is not null. */}
        {status && (
          // Pass the kind (colour/role), a label chosen by a ternary, and the message as children.
          <Callout kind={status.kind} label={status.kind === 'good' ? 'Saved' : 'Action needed'}>
            {/* The message text becomes the Callout's children prop. */}
            {status.text}
          {/* Close the Callout. */}
          </Callout>
        // Close the conditional expression.
        )}

        {/* Submit button; aria-busy tells assistive technology it is working while loading is true. */}
        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {/* Show the spinner only while loading (hidden from screen readers). */}
          {loading && <span className="spinner" aria-hidden="true" />}
          {/* Button text switches with the loading state. */}
          {loading ? 'Saving…' : 'Save username'}
        {/* Close the button. */}
        </button>
        {/* Screen-reader-only live status text, filled only while loading. */}
        <span className="sr-only" role="status">{loading ? 'Saving your username, please wait.' : ''}</span>
      {/* Close the fieldset. */}
      </fieldset>
    {/* Close the form. */}
    </form>
  // Close the return parenthesis.
  )
// Close the component.
}