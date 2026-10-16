import { passwordStrength } from '../utils/validation.js'

export default function StrengthMeter({ password }) {
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
