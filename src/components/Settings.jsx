/**
 * FILE OVERVIEW: Settings.jsx
 *
 * WHAT IT DOES:
 *   The Settings panel. It lets the user change the opening cash balance and the
 *   currency symbol, and it contains an "Account" section where they can change their
 *   username and/or password. Administrators also see a read-only list of all
 *   accounts stored in the browser.
 *
 * WHERE IT FITS:
 *   The default export (Settings) is toggled open and closed by Tracker.jsx via its
 *   showSettings state, and receives open, cur and onChange from Tracker. Inside it
 *   there are three internal components: AccountSection (wrapper that owns the
 *   "saved" message), AccountForm (the form) and AdminPanel (admin-only list). The
 *   auth data and actions come from the useAuth() hook.
 *
 * REACT MECHANICS USED:
 *   - useState: AccountForm -> loading, formError; AccountSection -> version, saved
 *   - useCallback: keeps the validate function stable between renders (its only
 *     dependency is user.email)
 *   - Custom hooks: useAuth(), useForm(), useFocusWhenIdle()
 *   - Props RECEIVED (Settings): open (opening balance), cur (currency symbol),
 *     onChange (callback that receives a patch object and merges it into Tracker's data state)
 *   - Props PASSED: user/onSaved/onEdit to AccountForm; id/label/hint/error + spread
 *     of form.field(...) to TextField and PasswordField; kind/label to Callout
 *   - key trick: key={`${user.username}:${version}`} on AccountForm. Changing the key
 *     makes React throw away and recreate the form, which resets its fields
 *   - Array methods: FIELDS.find(...) (first invalid field name);
 *     [..].filter(Boolean).join(' and ') (removes false entries, then joins labels);
 *     accounts.map(...) (one <li> per account in AdminPanel)
 *   - Conditional rendering with && (new-password confirm field, error/saved callouts,
 *     role badge, AdminPanel)
 *   - Controlled inputs (Settings: open and cur inputs)
 *   - NOTE: the visible validation depends on the validators and useForm sources,
 *     which are not in these files; their behaviour is described here from how they are used
 */

// Import useCallback (memoize a function) and useState (local state) from React
import { useCallback, useState } from 'react'
// Import Callout, the message box component used for errors and the "Saved" message
import Callout from './Callout.jsx'
// Import PasswordField, a password input with a show/hide toggle
import PasswordField from './PasswordField.jsx'
// Import TextField, a labeled text input with error/hint display
import TextField from './TextField.jsx'
// Import the custom hook that exposes the signed-in user and auth actions
import { useAuth } from '../hooks/useAuth.js'
// Import the two custom form hooks: focus-after-loading and the form state manager
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
// Import AuthError (expected auth failure class) and loadUsers (reads all stored accounts)
import { AuthError, loadUsers } from '../utils/auth.js'
// Import the object of reusable validation rules
import { validators } from '../utils/validation.js'

// Array of form field names, in on-screen order, checked on submit to find the first invalid one
const FIELDS = ['username', 'currentPassword', 'newPassword', 'confirm']
// Lookup object that maps each field name to the DOM id of its input (used to focus the right input)
const IDS = {
  // The username input's id
  username: 'account-username',
  // The current-password input's id
  currentPassword: 'account-current',
  // The new-password input's id
  newPassword: 'account-new',
  // The confirm-new-password input's id
  confirm: 'account-confirm',
// Close the IDS object
}
// Starting values for the password fields (username is added later from the user prop)
const INITIAL = { currentPassword: '', newPassword: '', confirm: '' }

// Internal component for the account form; it receives user (current account), onSaved (callback after a successful save) and onEdit (callback when the user types)
function AccountForm({ user, onSaved, onEdit }) {
  // Get the updateAccount action from the auth context
  const { updateAccount } = useAuth()
  // STATE: loading is true while the save request is running
  const [loading, setLoading] = useState(false)
  // STATE: formError holds the form-level error text ('' means none)
  const [formError, setFormError] = useState('')
  // Defined inside the component because it needs this account's email, so a new password
  // equal to that email is rejected. useCallback keeps it stable between renders
  // (useForm re-validates only when this function or the values change).
  // Create validate once and reuse the same function until the dependency changes
  const validate = useCallback(
    // The validator function: v is the current values object; it returns an error-message object keyed by field (the parentheses wrap the object literal)
    (v) => ({
      // Check the username against the username rules
      username: validators.username(v.username),
      // Check the current password field
      currentPassword: validators.currentPassword(v.currentPassword),
      // Check the new password only if provided; it also gets user.email so it cannot equal the email
      newPassword: validators.optionalNewPassword(v.newPassword, user.email),
      // Check that the confirm value matches the new password (only if a new password was typed)
      confirm: validators.optionalConfirm(v.confirm, v.newPassword),
    // Close the returned object and the arrow function
    }),
    // DEPENDENCY ARRAY: recreate validate only when user.email changes
    [user.email]
  // Close useCallback
  )
  // Create the form manager: starting values (the INITIAL passwords plus the current username), the validate function, and a callback run on each field change that clears the form error and tells the parent (onEdit) to hide the old "Saved" message
  const form = useForm({ ...INITIAL, username: user.username }, validate, () => {
    // Clear the form-level error as the user edits
    setFormError('')
    // Call the parent's onEdit callback (it clears the "saved" message)
    onEdit()
  // Close the callback and the useForm call
  })
  // Get queueFocus, which focuses an element by id once loading is no longer true
  const queueFocus = useFocusWhenIdle(loading)
  // Destructure the current values object out of the form for shorter access (values.username, values.newPassword, ...)
  const { values } = form

  // Async submit handler; e is the submit event
  const submit = async (e) => {
    // Prevent the browser's default page-reloading submit
    e.preventDefault()
    // Ignore the submit if a save is already running
    if (loading) return

    // true if the trimmed username text differs from the saved username
    const nameChanged = values.username.trim() !== user.username
    // true if the new password box has any text (Boolean converts the string to true/false)
    const pwChanged = Boolean(values.newPassword)
    // If neither username nor password changed, there is nothing to save
    if (!nameChanged && !pwChanged) {
      // Show an explanatory message in the Callout
      setFormError('There is nothing to save yet. Change your username or enter a new password.')
      // Stop without calling the server/auth layer
      return
    // Close the nothing-changed block
    }

    // ARRAY ITERATION (.find): walks FIELDS in order and returns the first field name whose entry in form.errors is truthy (has an error message); the result is undefined if all fields are valid
    const invalid = FIELDS.find((name) => form.errors[name])
    // If a field name was found, at least one field is invalid
    if (invalid) {
      // Mark all fields as touched so every error message is displayed
      form.touchAll()
      // Show the form-level message
      setFormError('Fix the highlighted fields, then try again.')
      // Use the IDS lookup to find that field's input id and focus it (?. avoids an error if the element is not on the page, e.g. the confirm field when hidden)
      document.getElementById(IDS[invalid])?.focus()
      // Stop without saving
      return
    // Close the invalid block
    }

    // Clear any old form-level error
    setFormError('')
    // Turn loading on (disables the fieldset, shows the spinner)
    setLoading(true)
    // Start a try block to catch errors from updateAccount
    try {
      // Wait for the account update to finish, sending the three relevant values
      await updateAccount({
        // The new (or unchanged) username text
        username: values.username,
        // The current password, needed to authorize the change
        currentPassword: values.currentPassword,
        // The new password ('' if the user is not changing it)
        newPassword: values.newPassword,
      // Close the object and the call
      })
      // ARRAY ITERATION (.filter): the array holds either a label string or `false` for each thing that changed (because `nameChanged && 'username'` gives false when nameChanged is false); filter(Boolean) removes the false entries; join(' and ') makes e.g. "username and password"
      const what = [nameChanged && 'username', pwChanged && 'password'].filter(Boolean).join(' and ')
      // CALLBACK UP: call the parent's onSaved with a message; "were" is used when both changed, otherwise "was"
      onSaved(`Your ${what} ${nameChanged && pwChanged ? 'were' : 'was'} updated. Use the new details the next time you log in.`)
    // Run this if updateAccount throws
    } catch (err) {
      // If it is an AuthError that names a specific field and that field has a known input id
      if (err instanceof AuthError && err.field && IDS[err.field]) {
        // Attach the server's message to that field so it shows under that input
        form.setServerError(err.field, err.message)
        // Focus that input once loading has finished
        queueFocus(IDS[err.field])
      // Otherwise it is a general error
      } else {
        // Show the AuthError message if it is one, or a generic fallback for unexpected errors
        setFormError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      // Close the inner if/else
      }
    // The finally block always runs
    } finally {
      // Turn loading off whether the save worked or failed
      setLoading(false)
    // Close try/catch/finally
    }
  // Close the submit function
  }

  // Return the form JSX
  return (
    // Form element: our submit handler, browser validation off, named by the heading with id "account-title" (that heading lives in AccountSection)
    <form onSubmit={submit} noValidate aria-labelledby="account-title">
      {/* Fieldset groups the controls; disabled={loading} disables every control inside while saving */}
      <fieldset className="auth-fieldset" disabled={loading}>
        {/* Username field */}
        <TextField
          // PROP: id of the input (also used in the IDS lookup)
          id="account-username"
          // PROP: visible label
          label="Username"
          // PROP: tells password managers this is the username
          autoComplete="username"
          // PROP: stop mobile auto-capitalisation
          autoCapitalize="none"
          // PROP: turn off spell-check underlines
          spellCheck={false}
          // PROP: help text, replaced by the error when one exists
          hint="You log in with this. At least 3 characters, no spaces."
          // PROP: this field's error message from the form manager
          error={form.error('username')}
          // SPREAD: controlled-input props (value, onChange, onBlur) for the 'username' field
          {...form.field('username')}
        // Self-closing end of TextField
        />

        {/* New password field */}
        <PasswordField
          // PROP: id of the input
          id="account-new"
          // PROP: visible label
          label="New password"
          // PROP: tells password managers this is a new password
          autoComplete="new-password"
          // PROP: help text
          hint="Leave blank to keep your current password."
          // PROP: this field's error message
          error={form.error('newPassword')}
          // SPREAD: controlled-input props for 'newPassword'
          {...form.field('newPassword')}
        // Self-closing end of PasswordField
        />

        {/* CONDITIONAL RENDER: the confirm field only appears when the new password box is not empty (an empty string is falsy so nothing renders) */}
        {values.newPassword && (
          // Confirm new password field
          <PasswordField
            // PROP: id of the input
            id="account-confirm"
            // PROP: visible label
            label="Confirm new password"
            // PROP: tells password managers this is a new password
            autoComplete="new-password"
            // PROP: shows "Passwords match." only if something was typed and there is no confirm error; otherwise undefined so no hint renders
            hint={values.confirm && !form.errors.confirm ? 'Passwords match.' : undefined}
            // PROP: this field's error message
            error={form.error('confirm')}
            // SPREAD: controlled-input props for 'confirm'
            {...form.field('confirm')}
          // Self-closing end of PasswordField
          />
        // Close the && expression
        )}

        {/* Current password field (always shown, required to authorize any change) */}
        <PasswordField
          // PROP: id of the input
          id="account-current"
          // PROP: visible label
          label="Current password"
          // PROP: tells password managers this is the existing password
          autoComplete="current-password"
          // PROP: help text
          hint="Required to save any account change."
          // PROP: this field's error message
          error={form.error('currentPassword')}
          // SPREAD: controlled-input props for 'currentPassword'
          {...form.field('currentPassword')}
        // Self-closing end of PasswordField
        />

        {/* CONDITIONAL RENDER: show the error Callout only when formError is a non-empty string; kind and label are props, the message is passed as children */}
        {formError && <Callout kind="bad" label="Action needed">{formError}</Callout>}

        {/* Submit button; aria-busy tells assistive tech it is working while loading is true */}
        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {/* While loading show a decorative spinner; otherwise `false` renders nothing */}
          {loading && <span className="spinner" aria-hidden="true" />}
          {/* Button text changes with loading state */}
          {loading ? 'Saving…' : 'Save account changes'}
        {/* Close the submit button */}
        </button>
        {/* Screen-reader-only live status that announces progress while saving */}
        <span className="sr-only" role="status">{loading ? 'Saving account changes, please wait.' : ''}</span>
      {/* Close the fieldset */}
      </fieldset>
    {/* Close the form */}
    </form>
  // Close the parentheses around the returned JSX
  )
// Close the AccountForm function body
}

// Read-only list of accounts. Only rendered for administrators.
// Internal component with no props; it lists every registered account
function AdminPanel() {
  // Read all stored accounts (an array of user objects) from storage; this runs on every render of AdminPanel
  const accounts = loadUsers()
  // Return the panel JSX
  return (
    // Section landmark named by the heading below
    <section className="settings-section" aria-labelledby="admin-title">
      {/* Heading referenced by aria-labelledby */}
      <h3 id="admin-title">Administrator tools</h3>
      {/* Explanatory text */}
      <p className="auth-sub">Registered accounts in this browser (prototype, read-only).</p>
      {/* Unordered list that will hold one <li> per account */}
      <ul className="tx-list">
        {/* ARRAY ITERATION (.map): turns each account object a into a list item; key={a.id} is the unique stable identity React needs to track each row */}
        {accounts.map((a) => (
          // One list item per account
          <li className="tx" key={a.id}>
            {/* Left side wrapper */}
            <div>
              {/* Account display name */}
              <span className="tx-title">{a.name}</span>
              {/* Username if there is one; otherwise fall back to the email (|| picks the first truthy value) */}
              <span className="tx-meta">{a.username || a.email}</span>
            {/* Close the left wrapper */}
            </div>
            {/* Role text: "Administrator" if a.role is 'admin', otherwise "User" */}
            <b className="tx-amount">{a.role === 'admin' ? 'Administrator' : 'User'}</b>
          {/* Close the list item */}
          </li>
        // Close the arrow function's parentheses and the map call
        ))}
      {/* Close the list */}
      </ul>
    {/* Close the section */}
    </section>
  // Close the parentheses around the returned JSX
  )
// Close the AdminPanel function body
}

// Internal component that wraps the account heading, the form, the "Saved" message and the admin panel
function AccountSection() {
  // Read the signed-in user and the isAdmin flag from the auth context
  const { user, isAdmin } = useAuth()
  // STATE: version is a counter used only inside the key below
  const [version, setVersion] = useState(0) // bumping this clears the form after a save
  // STATE: saved is the success message text ('' means none shown)
  const [saved, setSaved] = useState('')

  // Return the JSX
  return (
    // Fragment so two sibling blocks (account section and admin panel) can be returned
    <>
      {/* Account section landmark named by the heading below */}
      <section className="settings-section" aria-labelledby="account-title">
        {/* Heading; its id is what AccountForm's aria-labelledby points to */}
        <h3 id="account-title">Account</h3>
        {/* Paragraph showing who is signed in */}
        <p className="auth-sub">
          {/* Text followed by the username in bold */}
          Signed in as <strong>{user.username}</strong>
          {/* CONDITIONAL RENDER: show an "Administrator" badge only for admins */}
          {isAdmin && <span className="role-badge">Administrator</span>}
        {/* Close the paragraph */}
        </p>

        {/* Render the form. PROPS FLOW: user goes down (read-only data), onEdit and onSaved are callbacks that let the child report events up */}
        <AccountForm
          // KEY: when version or username changes the key changes, so React unmounts the old form and mounts a fresh one with empty password fields and the updated username
          key={`${user.username}:${version}`}
          // PROP: the current user object (the form reads username and email from it)
          user={user}
          // PROP: callback run when the user edits a field; it clears the saved message
          onEdit={() => setSaved('')}
          // PROP: callback run after a successful save; it receives the success message
          onSaved={(message) => {
            // Store the message so the "Saved" Callout appears
            setSaved(message)
            // Increase version using the previous value (functional update) so the key changes and the form resets
            setVersion((v) => v + 1)
          // Close the callback body
          }}
        // Self-closing end of AccountForm
        />

        {/* CONDITIONAL RENDER: show the green "Saved" Callout only when saved is non-empty */}
        {saved && <Callout kind="good" label="Saved">{saved}</Callout>}
      {/* Close the account section */}
      </section>

      {/* CONDITIONAL RENDER: only administrators see the AdminPanel */}
      {isAdmin && <AdminPanel />}
    {/* Close the fragment */}
    </>
  // Close the parentheses around the returned JSX
  )
// Close the AccountSection function body
}

// Export the Settings panel; it destructures three props from Tracker: open (opening balance number), cur (currency symbol string) and onChange (function that takes a patch object)
export default function Settings({ open, cur, onChange }) {
  // Return the JSX
  return (
    // Card section named by the heading below; id="settings-panel" is the target of the toggle button's aria-controls in Tracker
    <section className="card" id="settings-panel" aria-labelledby="settings-title">
      {/* Heading referenced by aria-labelledby */}
      <h2 id="settings-title">Settings</h2>
      {/* Two-column row */}
      <div className="row2">
        {/* Left column: opening cash balance */}
        <div>
          {/* Label linked to the input with id "open" */}
          <label htmlFor="open">Opening cash balance</label>
          {/* CONTROLLED number input: value comes from the `open` prop (state lives in Tracker); on change it sends a patch { open: number } up to Tracker via onChange; parseFloat(...) || 0 turns empty or invalid text (NaN) into 0 */}
          <input id="open" type="number" inputMode="decimal" value={open}
            // Event handler: runs on every edit, parsing the text and reporting it up to the parent
            onChange={(e) => onChange({ open: parseFloat(e.target.value) || 0 })}
            // Link the input to the hint paragraph below for screen readers
            aria-describedby="open-hint" />
          {/* Hint paragraph; its id matches aria-describedby above */}
          <p id="open-hint" className="hint">Cash you had before your first entry.</p>
        {/* Close the left column */}
        </div>
        {/* Right column: currency symbol */}
        <div>
          {/* Label linked to the input with id "cur" */}
          <label htmlFor="cur">Currency symbol</label>
          {/* CONTROLLED text input: value comes from the `cur` prop; maxLength limits the symbol to 4 characters; on change it sends { cur: text } up to Tracker */}
          <input id="cur" maxLength={4} autoComplete="off" value={cur}
            // Event handler: report the new symbol text to the parent as a patch object
            onChange={(e) => onChange({ cur: e.target.value })}
            // Link the input to the hint paragraph below for screen readers
            aria-describedby="cur-hint" />
          {/* Hint paragraph; its id matches aria-describedby above */}
          <p id="cur-hint" className="hint">Shown before every amount.</p>
        {/* Close the right column */}
        </div>
      {/* Close the two-column row */}
      </div>

      {/* Render the account section (it handles its own state and reads auth data itself, so no props are needed) */}
      <AccountSection />
    {/* Close the card section */}
    </section>
  // Close the parentheses around the returned JSX
  )
// Close the Settings function body
}