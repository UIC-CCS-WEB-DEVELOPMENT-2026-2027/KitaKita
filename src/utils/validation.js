export const MIN_PASSWORD = 8

// Deliberately simple: something@something.tld with no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Message shown when a password is just the account's email address.
export const PASSWORD_IS_EMAIL = 'Your password cannot be the same as your email address.'

// True when the password equals the email. The comparison ignores letter case and
// surrounding spaces, so "Smile@Gmail.com" is rejected when the email is "smile@gmail.com".
// Accounts with no email (admin, demo) have nothing to compare against, so they pass.
export const isSameAsEmail = (password, email) =>
  Boolean(email) && Boolean(password) && password.trim().toLowerCase() === email.trim().toLowerCase()

// Each validator returns an error message, or '' when the value is fine.
export const validators = {
  name: (v) => {
    const s = v.trim()
    if (!s) return 'Enter your full name.'
    if (s.length < 2) return 'Your name must be at least 2 characters.'
    return ''
  },
  email: (v) => {
    const s = v.trim()
    if (!s) return 'Enter your email address.'
    if (!EMAIL_RE.test(s)) return 'Enter a valid email, like name@example.com.'
    return ''
  },
  // Log in accepts an email or a username, so there is no email-format check here.
  identifier: (v) => (v.trim() ? '' : 'Enter your email or username.'),
  username: (v) => {
    const s = v.trim()
    if (!s) return 'Enter a username.'
    if (s.length < 3) return 'Your username must be at least 3 characters.'
    if (s.length > 64) return 'Your username must be 64 characters or fewer.'
    if (/\s/.test(s)) return 'Your username cannot contain spaces.'
    return ''
  },
  loginPassword: (v) => (v ? '' : 'Enter your password.'),
  currentPassword: (v) => (v ? '' : 'Enter your current password to save changes.'),
  // `email` is optional: pass it wherever the account's email is known so the
  // "password must not equal email" rule can be applied.
  newPassword: (v, email = '') => {
    if (!v) return 'Create a password.'
    if (isSameAsEmail(v, email)) return PASSWORD_IS_EMAIL
    if (v.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters. You have ${v.length}.`
    return ''
  },
  // Account settings: leaving the new password blank means "keep my current one".
  optionalNewPassword: (v, email = '') => (v ? validators.newPassword(v, email) : ''),
  confirm: (v, password) => {
    if (!v) return 'Re-enter your password to confirm it.'
    if (v !== password) return 'Passwords do not match.'
    return ''
  },
  optionalConfirm: (v, password) => (password ? validators.confirm(v, password) : ''),
  terms: (v) => (v ? '' : 'Accept the Terms & Conditions to create an account.'),
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']

// Rough guide for the meter only. The hard rule is MIN_PASSWORD.
export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '' }
  let score = 0
  if (pw.length >= MIN_PASSWORD) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (pw.length < MIN_PASSWORD) score = 1
  score = Math.max(1, score)
  return { score, label: STRENGTH_LABELS[score] }
}
