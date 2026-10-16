import { useState } from 'react'
import Callout from './Callout.jsx'
import PasswordField from './PasswordField.jsx'
import TextField from './TextField.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useFocusWhenIdle, useForm } from '../hooks/useForm.js'
import { AuthError } from '../utils/auth.js'
import { passwordStrength, validators } from '../utils/validation.js'

const FIELDS = ['name', 'email', 'password', 'confirm', 'terms']

const INITIAL = { name: '', email: '', password: '', confirm: '', terms: false }

const validate = (v) => ({
  name: validators.name(v.name),
  email: validators.email(v.email),
  password: validators.newPassword(v.password),
  confirm: validators.confirm(v.confirm, v.password),
  terms: validators.terms(v.terms),
})

function StrengthMeter({ password }) {
  if (!password) return null
  const { score, label } = passwordStrength(password)
  return (
    <div className="strength" data-level={score}>
      <div className="strength-bar" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => <i key={n} className={n <= score ? 'on' : ''} />)}
      </div>
      <span className="strength-label">Strength: {label}</span>
    </div>
  )
}

export default function SignUpForm({ headingRef }) {
  const { signup } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const form = useForm(INITIAL, validate, () => setFormError(''))
  const queueFocus = useFocusWhenIdle(loading)
  const { values } = form

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return

    const invalid = FIELDS.find((name) => form.errors[name])
    if (invalid) {
      form.touchAll()
      setFormError('Fix the highlighted fields, then try again.')
      document.getElementById(`signup-${invalid}`)?.focus()
      return
    }

    setFormError('')
    setLoading(true)
    try {
      await signup({ name: values.name, email: values.email, password: values.password })
    } catch (err) {
      if (err instanceof AuthError) {
        setFormError(err.message)
        if (err.field === 'email') {
          form.setServerError('email', 'This email is already registered.')
          queueFocus('signup-email')
        }
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const termsError = form.error('terms')

  return (
    <form onSubmit={submit} noValidate aria-labelledby="signup-title">
      <h2 id="signup-title" ref={headingRef} tabIndex={-1} className="auth-title">Create your account</h2>
      <p className="auth-sub">Your register, insights and history are kept per account.</p>

      <fieldset className="auth-fieldset" disabled={loading}>
        <TextField
          id="signup-name"
          label="Full name"
          autoComplete="name"
          placeholder="Juan dela Cruz"
          error={form.error('name')}
          {...form.field('name')}
        />

        <TextField
          id="signup-email"
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

        <PasswordField
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={form.error('password')}
          {...form.field('password')}
        >
          <StrengthMeter password={values.password} />
        </PasswordField>

        <PasswordField
          id="signup-confirm"
          label="Confirm password"
          autoComplete="new-password"
          hint={values.confirm && !form.errors.confirm ? 'Passwords match.' : undefined}
          error={form.error('confirm')}
          {...form.field('confirm')}
        />

        <div className="field">
          <label className="check" htmlFor="signup-terms">
            <input
              id="signup-terms"
              type="checkbox"
              checked={values.terms}
              aria-invalid={termsError ? 'true' : undefined}
              aria-describedby={termsError ? 'signup-terms-error' : undefined}
              onChange={(e) => {
                form.setValue('terms', e.target.checked)
                form.touch('terms')
              }}
            />
            <span>I agree to the Terms &amp; Conditions.</span>
          </label>
          {termsError && <p id="signup-terms-error" className="field-error">{termsError}</p>}
          <details className="chart-details terms-details">
            <summary>Read the Terms &amp; Conditions</summary>
            <div className="terms-body" tabIndex={0} role="region" aria-label="Terms and Conditions">
              <p>Kita Kita is a simple cash register and planning aid for small businesses. It is provided as is, without warranties.</p>
              <p>The guidance it shows is based only on the numbers you enter. It is a starting point, not financial, legal or tax advice.</p>
              <p>Your entries are stored in this browser. You are responsible for keeping backups, for example with Export CSV.</p>
              <p>Do not enter information you are not allowed to store, and do not reuse a password from another service.</p>
            </div>
          </details>
        </div>

        {formError && <Callout kind="bad" label="Action needed">{formError}</Callout>}

        <button className="btn btn-primary" type="submit" aria-busy={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <span className="sr-only" role="status">{loading ? 'Creating your account, please wait.' : ''}</span>
      </fieldset>
    </form>
  )
}
