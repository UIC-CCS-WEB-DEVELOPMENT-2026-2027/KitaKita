import { useState } from 'react'
import Callout from './Callout.jsx'
import TextField from './TextField.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
import { validators } from '../utils/validation.js'

const validate = (v) => ({ email: validators.email(v.email) })

export default function ForgotPasswordForm({ headingRef, initialEmail, onBack }) {
  const { requestPasswordReset } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [formError, setFormError] = useState('')
  const form = useForm({ email: initialEmail }, validate, () => setFormError(''))
  const queueFocus = useFocusWhenIdle(loading)

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return

    if (form.errors.email) {
      form.touchAll()
      document.getElementById('forgot-email')?.focus()
      return
    }

    setFormError('')
    setSentTo('')
    setLoading(true)
    try {
      await requestPasswordReset(form.values.email)
      setSentTo(form.values.email.trim())
    } catch {
      setFormError('We could not send the reset link. Please try again.')
      queueFocus('forgot-email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby="forgot-title">
      <h2 id="forgot-title" ref={headingRef} tabIndex={-1} className="auth-title">Reset your password</h2>
      <p className="auth-sub">Enter the email you signed up with and we will send a link to choose a new password.</p>

      <fieldset className="auth-fieldset" disabled={loading}>
        <TextField
          id="forgot-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          error={form.error('email')}
          {...form.field('email')}
        />

        {sentTo && (
          <Callout kind="good" label="Check your email">
            If an account exists for {sentTo}, a reset link is on its way.
          </Callout>
        )}
        {formError && <Callout kind="bad" label="Action needed">{formError}</Callout>}

        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? 'Sending…' : sentTo ? 'Send again' : 'Send reset link'}
        </button>
        <span className="sr-only" role="status">{loading ? 'Sending reset link, please wait.' : ''}</span>
      </fieldset>

      <div className="auth-back">
        <button type="button" className="link-btn" onClick={onBack}>Back to log in</button>
      </div>
    </form>
  )
}
