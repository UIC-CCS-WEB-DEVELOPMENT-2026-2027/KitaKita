/*
 * =============================================================================
 * FILE OVERVIEW: validation.js (utils/validation.js)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * validation.js is a plain JavaScript utility module (NOT a React component: no
 * JSX, no hooks, no props). It holds the form-checking rules for the login,
 * sign-up and account-settings forms as small PURE functions (same input ->
 * same output, nothing outside the function is changed). It:
 *   - defines constants (MIN_PASSWORD, PASSWORD_IS_EMAIL message, a private email regex),
 *   - checks whether a password is just the account's email (isSameAsEmail),
 *   - exposes a `validators` object: one function per form field. Each returns
 *     an error message string, or '' (empty string) when the value is fine,
 *   - scores a password from 1 to 4 for a strength meter (passwordStrength).
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   components/Auth.jsx (login / sign-up form) and components/Settings.jsx
 *   (account settings, if it edits the account) are the likely consumers; check
 *   their import lines to confirm. They call e.g. validators.email(value) and
 *   store the returned message in their OWN useState (an `errors` object), then
 *   show it under the matching input. The `terms` and `confirm` rules receive
 *   extra arguments (the checkbox value, the password to compare with).
 *   passwordStrength() is likely used to draw the strength meter next to the
 *   password field.
 *   State flow: this file holds NO state. The form component owns the state;
 *   it passes the current value IN to a validator and receives a message OUT.
 *
 * PRIMARY MECHANICS USED
 * ----------------------
 *   - No useState, no props, no JSX in this file. No .map() or .filter().
 *   - Return convention: '' means VALID (falsy), a non-empty string means
 *     INVALID (truthy) and is the message shown to the user. Be ready to
 *     explain why: `if (message)` in the form means "there is an error".
 *   - Arrow functions, with and without braces (implicit return vs return).
 *   - Early returns: each check returns as soon as it fails, so only the FIRST
 *     problem is reported.
 *   - Regular expressions (regex): EMAIL_RE.test(), /\s/.test(), /[a-z]/.test(), etc.
 *   - String methods: .trim(), .toLowerCase(), .length.
 *   - Default parameters: (v, email = '').
 *   - Template literals: `Use at least ${MIN_PASSWORD} characters...`.
 *   - Boolean() conversion and && chaining, ternary ?:, and ++ (increment).
 *   - Object property referencing its own sibling: validators.newPassword is
 *     called from inside optionalNewPassword and validators.confirm from
 *     optionalConfirm (works because it runs later, after the object exists).
 *   - Array indexing: STRENGTH_LABELS[score] picks the label for a score.
 * =============================================================================
 */

// Export the minimum number of characters a password must have (8); it is the single "hard rule" reused in messages and the strength meter.
export const MIN_PASSWORD = 8

// Deliberately simple: something@something.tld with no spaces.
// Module-private regex: ^ start; [^\s@]+ one or more characters that are not whitespace or "@"; "@"; [^\s@]+ more such characters; "\." a literal dot; [^\s@]{2,} at least 2 characters (the domain ending, like "com"); $ end.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Message shown when a password is just the account's email address.
// Export the error text as a constant so other files can show or compare the exact same message.
export const PASSWORD_IS_EMAIL = 'Your password cannot be the same as your email address.'

// True when the password equals the email. The comparison ignores letter case and
// surrounding spaces, so "Smile@Gmail.com" is rejected when the email is "smile@gmail.com".
// Accounts with no email (admin, demo) have nothing to compare against, so they pass.
// Export isSameAsEmail: an arrow function with an implicit return (no braces) taking a password and an email.
export const isSameAsEmail = (password, email) =>
  // Boolean(email) is false for an empty/missing email, and && short-circuits, so accounts without an email pass; Boolean(password) guards against an empty password; the last part compares both values after trimming spaces and lower-casing.
  Boolean(email) && Boolean(password) && password.trim().toLowerCase() === email.trim().toLowerCase()

// Each validator returns an error message, or '' when the value is fine.
// Export `validators`, an object whose properties are validator functions, one per form field; forms call them as validators.fieldName(value).
export const validators = {
  // Name validator: takes the typed value `v` and returns an error message or ''.
  name: (v) => {
    // Remove leading and trailing spaces so "   " counts as empty.
    const s = v.trim()
    // If nothing is left after trimming, the name is missing: return that message (early return).
    if (!s) return 'Enter your full name.'
    // If the trimmed name is shorter than 2 characters, return the length message.
    if (s.length < 2) return 'Your name must be at least 2 characters.'
    // All checks passed: an empty string means "no error".
    return ''
  // Close the name function; the comma separates object properties.
  },
  // Email validator: takes the typed value `v`.
  email: (v) => {
    // Trim surrounding spaces before checking.
    const s = v.trim()
    // If empty, ask for the email.
    if (!s) return 'Enter your email address.'
    // EMAIL_RE.test(s) returns true when the format matches; the ! flips it, so a bad format returns the error message with an example.
    if (!EMAIL_RE.test(s)) return 'Enter a valid email, like name@example.com.'
    // Valid: no error.
    return ''
  // Close the email function.
  },
  // Log in accepts an email or a username, so there is no email-format check here.
  // Login identifier validator: one-line arrow with a ternary; if the trimmed value has any text (truthy) return '' (valid), otherwise return the message.
  identifier: (v) => (v.trim() ? '' : 'Enter your email or username.'),
  // Username validator (used at sign-up / account settings): takes the typed value `v`.
  username: (v) => {
    // Trim surrounding spaces first.
    const s = v.trim()
    // Empty username: ask for one.
    if (!s) return 'Enter a username.'
    // Too short (under 3 characters).
    if (s.length < 3) return 'Your username must be at least 3 characters.'
    // Too long (over 64 characters).
    if (s.length > 64) return 'Your username must be 64 characters or fewer.'
    // /\s/ matches any whitespace character; .test() returns true if the username contains one, so spaces are rejected.
    if (/\s/.test(s)) return 'Your username cannot contain spaces.'
    // All username rules passed.
    return ''
  // Close the username function.
  },
  // Login password validator: any non-empty value is accepted (no spaces trimming, because spaces can be part of a password); the ternary returns '' when v is truthy, otherwise the message.
  loginPassword: (v) => (v ? '' : 'Enter your password.'),
  // Current-password validator used in account settings to confirm identity before saving changes; same truthy check as above.
  currentPassword: (v) => (v ? '' : 'Enter your current password to save changes.'),
  // `email` is optional: pass it wherever the account's email is known so the
  // "password must not equal email" rule can be applied.
  // New-password validator: `v` is the typed password; `email = ''` is a default parameter, so calling it with one argument still works (the email defaults to an empty string).
  newPassword: (v, email = '') => {
    // Empty password: ask the user to create one.
    if (!v) return 'Create a password.'
    // If the password equals the email (ignoring case and spaces), return the shared PASSWORD_IS_EMAIL message.
    if (isSameAsEmail(v, email)) return PASSWORD_IS_EMAIL
    // If shorter than MIN_PASSWORD, return a template literal message that shows the minimum and how many characters were typed.
    if (v.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters. You have ${v.length}.`
    // All password rules passed.
    return ''
  // Close the newPassword function.
  },
  // Account settings: leaving the new password blank means "keep my current one".
  // Optional new-password validator: if something was typed (truthy), run the full newPassword rules via validators.newPassword (the object referencing its own property); if blank, return '' so no error appears.
  optionalNewPassword: (v, email = '') => (v ? validators.newPassword(v, email) : ''),
  // Confirm-password validator: `v` is the confirmation field and `password` is the first password field to compare with.
  confirm: (v, password) => {
    // Confirmation left empty: ask the user to re-enter it.
    if (!v) return 'Re-enter your password to confirm it.'
    // !== is a strict comparison; if the two passwords differ, return the mismatch message.
    if (v !== password) return 'Passwords do not match.'
    // The two match: no error.
    return ''
  // Close the confirm function.
  },
  // Optional confirm validator: only runs the confirm rules when a new password was actually typed (password is truthy); otherwise returns '' so blank settings do not trigger an error.
  optionalConfirm: (v, password) => (password ? validators.confirm(v, password) : ''),
  // Terms validator: `v` is the checkbox value (true or false); a ticked box returns '' (valid), an unticked one returns the message.
  terms: (v) => (v ? '' : 'Accept the Terms & Conditions to create an account.'),
// Close the validators object.
}

// Module-private array of labels for the strength meter; the index equals the score, so index 0 is empty (no password), 1 is 'Weak', up to 4 'Strong'.
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']

// Rough guide for the meter only. The hard rule is MIN_PASSWORD.
// Export passwordStrength: takes a password string `pw` and returns an object { score, label } for the strength meter UI.
export function passwordStrength(pw) {
  // If nothing is typed, return score 0 and an empty label (the meter shows nothing).
  if (!pw) return { score: 0, label: '' }
  // `let` (not const) because score is changed below; it starts at 0.
  let score = 0
  // +1 point if the password is at least 8 characters long (score++ means score = score + 1).
  if (pw.length >= MIN_PASSWORD) score++
  // +1 more point if it is at least 12 characters long.
  if (pw.length >= 12) score++
  // +1 point if it has a lowercase letter AND an uppercase letter AND a digit (\d); all three regex tests must be true.
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) score++
  // +1 point if it has at least one character that is NOT a letter or digit (a symbol); [^A-Za-z0-9] means "anything except these".
  if (/[^A-Za-z0-9]/.test(pw)) score++
  // Override: a password under the minimum length is always forced to score 1 ("Weak"), no matter what else it contains.
  if (pw.length < MIN_PASSWORD) score = 1
  // Math.max(1, score) guarantees the score is at least 1 (a typed password never scores 0).
  score = Math.max(1, score)
  // Return the numeric score and the matching label looked up by array index (STRENGTH_LABELS[score]).
  return { score, label: STRENGTH_LABELS[score] }
// Close passwordStrength.
}