import { useState } from 'react'
import Callout from './Callout.jsx'
import PasswordField from './PasswordField.jsx'
import TextField from './TextField.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
import { AuthError } from '../utils/auth.js'
import { validators } from '../utils/validation.js'

const FIELDS = ['email', 'password']

const validate = (v) => ({
  email: validators.identifier(v.email), // email OR username
  password: validators.loginPassword(v.password),
})

export default function LoginForm({ headingRef, initialEmail, onForgot }) {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const form = useForm({ email: initialEmail, password: '', remember: false }, validate, () => setFormError(''))
  const queueFocus = useFocusWhenIdle(loading)

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return

    const invalid = FIELDS.find((name) => form.errors[name])
    if (invalid) {
      form.touchAll()
      setFormError('Fix the highlighted fields, then try again.')
      document.getElementById(`login-${invalid}`)?.focus()
      return
    }

    setFormError('')
    setLoading(true)
    try {
      await login({
        email: form.values.email,
        password: form.values.password,
        remember: form.values.remember,
      })
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      queueFocus('login-password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby="login-title">
      <h2 id="login-title" ref={headingRef} tabIndex={-1} className="auth-title">Welcome back</h2>
      <p className="auth-sub">Log in to open your register and insights.</p>

      <fieldset className="auth-fieldset" disabled={loading}>
        <TextField
          id="login-email"
          label="Email or username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com or username"
          error={form.error('email')}
          {...form.field('email')}
        />

        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          error={form.error('password')}
          {...form.field('password')}
        />

        <div className="auth-row">
          <label className="check">
            <input
              type="checkbox"
              checked={form.values.remember}
              onChange={(e) => form.setValue('remember', e.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <button type="button" className="link-btn" onClick={() => onForgot(form.values.email)}>
            Forgot password?
          </button>
        </div>

        {formError && <Callout kind="bad" label="Action needed">{formError}</Callout>}

        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        <span className="sr-only" role="status">{loading ? 'Logging in, please wait.' : ''}</span>
      </fieldset>
    </form>
  )
}
