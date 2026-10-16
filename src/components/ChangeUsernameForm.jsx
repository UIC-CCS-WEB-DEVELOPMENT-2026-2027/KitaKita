import { useCallback, useState } from 'react'
import Callout from './Callout.jsx'
import PasswordField from './PasswordField.jsx'
import TextField from './TextField.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
import { AuthError } from '../utils/auth.js'
import { validators } from '../utils/validation.js'

const FIELDS = ['newUsername', 'currentPassword']
const INITIAL = { newUsername: '', currentPassword: '' }

export default function ChangeUsernameForm() {
  const { user, changeUsername } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'good' | 'bad', text }
  const validate = useCallback(
    (v) => ({
      newUsername: validators.newUsername(v.newUsername, user.username),
      currentPassword: validators.currentPassword(v.currentPassword),
    }),
    [user.username]
  )
  const form = useForm(INITIAL, validate, () => setStatus(null))
  const queueFocus = useFocusWhenIdle(loading)

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return

    const invalid = FIELDS.find((name) => form.errors[name])
    if (invalid) {
      form.touchAll()
      setStatus({ kind: 'bad', text: 'Fix the highlighted fields, then try again.' })
      document.getElementById(invalid === 'newUsername' ? 'un-new' : 'un-current')?.focus()
      return
    }

    setStatus(null)
    setLoading(true)
    try {
      const updated = await changeUsername({
        currentPassword: form.values.currentPassword,
        newUsername: form.values.newUsername,
      })
      form.reset()
      setStatus({ kind: 'good', text: `Username changed to ${updated.username}. Use it the next time you log in.` })
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Something went wrong. Please try again.'
      setStatus({ kind: 'bad', text: message })
      if (err instanceof AuthError && err.field === 'newUsername') {
        form.setServerError('newUsername', message)
        queueFocus('un-new')
      } else {
        queueFocus('un-current')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate aria-labelledby="un-title">
      <h2 id="un-title">Change username</h2>
      <p className="auth-sub">You are signed in as <strong>{user.username}</strong>.</p>

      <fieldset className="auth-fieldset" disabled={loading}>
        <TextField
          id="un-new"
          label="New username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          error={form.error('newUsername')}
          {...form.field('newUsername')}
        />

        <PasswordField
          id="un-current"
          label="Current password"
          autoComplete="current-password"
          error={form.error('currentPassword')}
          {...form.field('currentPassword')}
        />

        {status && (
          <Callout kind={status.kind} label={status.kind === 'good' ? 'Saved' : 'Action needed'}>
            {status.text}
          </Callout>
        )}

        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? 'Saving…' : 'Save username'}
        </button>
        <span className="sr-only" role="status">{loading ? 'Saving your username, please wait.' : ''}</span>
      </fieldset>
    </form>
  )
}
