import { useState } from 'react'
import Callout from './Callout.jsx'
import PasswordField from './PasswordField.jsx'
import StrengthMeter from './StrengthMeter.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
import { AuthError } from '../utils/auth.js'
import { validators } from '../utils/validation.js'

const FIELDS = ['newPassword', 'confirm', 'currentPassword']
const IDS = { newPassword: 'pw-new', confirm: 'pw-confirm', currentPassword: 'pw-current' }
const INITIAL = { currentPassword: '', newPassword: '', confirm: '' }

const validate = (v) => ({
  currentPassword: validators.currentPassword(v.currentPassword),
  newPassword: validators.newPassword(v.newPassword),
  confirm: validators.confirm(v.confirm, v.newPassword),
})

export default function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'good' | 'bad', text }
  const form = useForm(INITIAL, validate, () => setStatus(null))
  const queueFocus = useFocusWhenIdle(loading)
  const { values } = form

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return

    const invalid = FIELDS.find((name) => form.errors[name])
    if (invalid) {
      form.touchAll()
      setStatus({ kind: 'bad', text: 'Fix the highlighted fields, then try again.' })
      document.getElementById(IDS[invalid])?.focus()
      return
    }

    setStatus(null)
    setLoading(true)
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      form.reset()
      setStatus({ kind: 'good', text: 'Password changed. Your old password no longer works.' })
    } catch (err) {
      setStatus({
        kind: 'bad',
        text: err instanceof AuthError ? err.message : 'Something went wrong. Please try again.',
      })
      queueFocus(err instanceof AuthError && err.field === 'newPassword' ? 'pw-new' : 'pw-current')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate aria-labelledby="pw-title">
      <h2 id="pw-title">Change password</h2>
      <p className="auth-sub">Use at least 8 characters.</p>

      <fieldset className="auth-fieldset" disabled={loading}>
        <PasswordField
          id="pw-current"
          label="Current password"
          autoComplete="current-password"
          error={form.error('currentPassword')}
          {...form.field('currentPassword')}
        />

        <PasswordField
          id="pw-new"
          label="New password"
          autoComplete="new-password"
          error={form.error('newPassword')}
          {...form.field('newPassword')}
        >
          <StrengthMeter password={values.newPassword} />
        </PasswordField>

        <PasswordField
          id="pw-confirm"
          label="Confirm new password"
          autoComplete="new-password"
          hint={values.confirm && !form.errors.confirm ? 'Passwords match.' : undefined}
          error={form.error('confirm')}
          {...form.field('confirm')}
        />

        {status && (
          <Callout kind={status.kind} label={status.kind === 'good' ? 'Saved' : 'Action needed'}>
            {status.text}
          </Callout>
        )}

        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? 'Saving…' : 'Save password'}
        </button>
        <span className="sr-only" role="status">{loading ? 'Saving your password, please wait.' : ''}</span>
      </fieldset>
    </form>
  )
}
