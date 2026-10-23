import { useCallback, useState } from 'react'
import Callout from './Callout.jsx'
import PasswordField from './PasswordField.jsx'
import TextField from './TextField.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
import { AuthError, loadUsers } from '../utils/auth.js'
import { validators } from '../utils/validation.js'

const FIELDS = ['username', 'currentPassword', 'newPassword', 'confirm']
const IDS = {
  username: 'account-username',
  currentPassword: 'account-current',
  newPassword: 'account-new',
  confirm: 'account-confirm',
}
const INITIAL = { currentPassword: '', newPassword: '', confirm: '' }

function AccountForm({ user, onSaved, onEdit }) {
  const { updateAccount } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  // Defined inside the component because it needs this account's email, so a new password
  // equal to that email is rejected. useCallback keeps it stable between renders
  // (useForm re-validates only when this function or the values change).
  const validate = useCallback(
    (v) => ({
      username: validators.username(v.username),
      currentPassword: validators.currentPassword(v.currentPassword),
      newPassword: validators.optionalNewPassword(v.newPassword, user.email),
      confirm: validators.optionalConfirm(v.confirm, v.newPassword),
    }),
    [user.email]
  )
  const form = useForm({ ...INITIAL, username: user.username }, validate, () => {
    setFormError('')
    onEdit()
  })
  const queueFocus = useFocusWhenIdle(loading)
  const { values } = form

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return

    const nameChanged = values.username.trim() !== user.username
    const pwChanged = Boolean(values.newPassword)
    if (!nameChanged && !pwChanged) {
      setFormError('There is nothing to save yet. Change your username or enter a new password.')
      return
    }

    const invalid = FIELDS.find((name) => form.errors[name])
    if (invalid) {
      form.touchAll()
      setFormError('Fix the highlighted fields, then try again.')
      document.getElementById(IDS[invalid])?.focus()
      return
    }

    setFormError('')
    setLoading(true)
    try {
      await updateAccount({
        username: values.username,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      const what = [nameChanged && 'username', pwChanged && 'password'].filter(Boolean).join(' and ')
      onSaved(`Your ${what} ${nameChanged && pwChanged ? 'were' : 'was'} updated. Use the new details the next time you log in.`)
    } catch (err) {
      if (err instanceof AuthError && err.field && IDS[err.field]) {
        form.setServerError(err.field, err.message)
        queueFocus(IDS[err.field])
      } else {
        setFormError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby="account-title">
      <fieldset className="auth-fieldset" disabled={loading}>
        <TextField
          id="account-username"
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          hint="You log in with this. At least 3 characters, no spaces."
          error={form.error('username')}
          {...form.field('username')}
        />

        <PasswordField
          id="account-new"
          label="New password"
          autoComplete="new-password"
          hint="Leave blank to keep your current password."
          error={form.error('newPassword')}
          {...form.field('newPassword')}
        />

        {values.newPassword && (
          <PasswordField
            id="account-confirm"
            label="Confirm new password"
            autoComplete="new-password"
            hint={values.confirm && !form.errors.confirm ? 'Passwords match.' : undefined}
            error={form.error('confirm')}
            {...form.field('confirm')}
          />
        )}

        <PasswordField
          id="account-current"
          label="Current password"
          autoComplete="current-password"
          hint="Required to save any account change."
          error={form.error('currentPassword')}
          {...form.field('currentPassword')}
        />

        {formError && <Callout kind="bad" label="Action needed">{formError}</Callout>}

        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? 'Saving…' : 'Save account changes'}
        </button>
        <span className="sr-only" role="status">{loading ? 'Saving account changes, please wait.' : ''}</span>
      </fieldset>
    </form>
  )
}

// Read-only list of accounts. Only rendered for administrators.
function AdminPanel() {
  const accounts = loadUsers()
  return (
    <section className="settings-section" aria-labelledby="admin-title">
      <h3 id="admin-title">Administrator tools</h3>
      <p className="auth-sub">Registered accounts in this browser (prototype, read-only).</p>
      <ul className="tx-list">
        {accounts.map((a) => (
          <li className="tx" key={a.id}>
            <div>
              <span className="tx-title">{a.name}</span>
              <span className="tx-meta">{a.username || a.email}</span>
            </div>
            <b className="tx-amount">{a.role === 'admin' ? 'Administrator' : 'User'}</b>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AccountSection() {
  const { user, isAdmin } = useAuth()
  const [version, setVersion] = useState(0) // bumping this clears the form after a save
  const [saved, setSaved] = useState('')

  return (
    <>
      <section className="settings-section" aria-labelledby="account-title">
        <h3 id="account-title">Account</h3>
        <p className="auth-sub">
          Signed in as <strong>{user.username}</strong>
          {isAdmin && <span className="role-badge">Administrator</span>}
        </p>

        <AccountForm
          key={`${user.username}:${version}`}
          user={user}
          onEdit={() => setSaved('')}
          onSaved={(message) => {
            setSaved(message)
            setVersion((v) => v + 1)
          }}
        />

        {saved && <Callout kind="good" label="Saved">{saved}</Callout>}
      </section>

      {isAdmin && <AdminPanel />}
    </>
  )
}

export default function Settings({ open, cur, onChange }) {
  return (
    <section className="card" id="settings-panel" aria-labelledby="settings-title">
      <h2 id="settings-title">Settings</h2>
      <div className="row2">
        <div>
          <label htmlFor="open">Opening cash balance</label>
          <input id="open" type="number" inputMode="decimal" value={open}
            onChange={(e) => onChange({ open: parseFloat(e.target.value) || 0 })}
            aria-describedby="open-hint" />
          <p id="open-hint" className="hint">Cash you had before your first entry.</p>
        </div>
        <div>
          <label htmlFor="cur">Currency symbol</label>
          <input id="cur" maxLength={4} autoComplete="off" value={cur}
            onChange={(e) => onChange({ cur: e.target.value })}
            aria-describedby="cur-hint" />
          <p id="cur-hint" className="hint">Shown before every amount.</p>
        </div>
      </div>

      <AccountSection />
    </section>
  )
}
