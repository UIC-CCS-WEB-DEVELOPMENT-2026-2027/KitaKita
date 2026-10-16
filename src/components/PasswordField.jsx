import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './Icons.jsx'

// Password input with a show/hide toggle. `children` render under the message (e.g. strength meter).
export default function PasswordField({ id, label, error, hint, children, ...inputProps }) {
  const [shown, setShown] = useState(false)
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={'pw-wrap' + (error ? ' is-invalid' : '')}>
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={messageId}
          {...inputProps}
        />
        <button
          type="button"
          className="pw-toggle"
          aria-label={`Show ${label.toLowerCase()}`}
          aria-pressed={shown}
          aria-controls={id}
          title={shown ? 'Hide password' : 'Show password'}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? (
        <p id={messageId} className="field-error">{error}</p>
      ) : hint ? (
        <p id={messageId} className="hint">{hint}</p>
      ) : null}
      {children}
    </div>
  )
}
