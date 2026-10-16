// Label + input + inline message. The error replaces the hint while it is showing.
export default function TextField({ id, label, error, hint, ...inputProps }) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={messageId} {...inputProps} />
      {error ? (
        <p id={messageId} className="field-error">{error}</p>
      ) : hint ? (
        <p id={messageId} className="hint">{hint}</p>
      ) : null}
    </div>
  )
}
