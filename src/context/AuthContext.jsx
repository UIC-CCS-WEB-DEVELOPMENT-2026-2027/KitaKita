/*
 * =============================================================================
 * FILE OVERVIEW: AuthContext.jsx (context/AuthContext.jsx)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * AuthContext.jsx is the AUTHENTICATION STATE CENTER of the app. It:
 *   1. creates a React Context, AuthContext (an app-wide "shared box"),
 *   2. exports AuthProvider, a component that holds the signed-in `user` in
 *      useState and defines the auth actions: login, signup, updateAccount,
 *      logout and requestPasswordReset,
 *   3. publishes `user`, derived flags (isAuthenticated, isAdmin) and those
 *      actions to every component below it through <AuthContext.Provider>.
 * The actual storage, hashing and session work is done by the helper functions
 * imported from utils/auth.js. This file connects those helpers to React state.
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   main.jsx            <AuthProvider><App /></AuthProvider>   (this file's provider wraps the app)
 *   utils/auth.js       storage + hashing helpers called from here
 *   utils/validation.js supplies PASSWORD_IS_EMAIL and isSameAsEmail (a server-side re-check)
 *   hooks/useAuth.js    useContext(AuthContext): how components READ this file's value
 *   App.jsx             const { user, logout } = useAuth(), then shows <Auth /> or <Tracker />
 *   components/Auth.jsx (and Settings.jsx) call login / signup / updateAccount /
 *                       requestPasswordReset. Check their code to confirm.
 *   FLOW: form submit -> login() -> hashes and checks the password -> saveSession()
 *         -> setUser(...) -> AuthProvider re-renders -> the context value
 *         changes -> App re-renders -> `user` is truthy -> Tracker appears.
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 * CONTEXT:
 *   - createContext(null) makes the context; the null default is what lets
 *     useAuth's guard (`if (!ctx) throw`) detect a missing provider.
 *   - <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
 *     shares `value` with every descendant. `children` is a PROP: whatever is
 *     nested between <AuthProvider> tags (here, <App />).
 * STATE (useState):
 *   - user : the signed-in person's PUBLIC data (no salt or hash), or null.
 *            Initialised lazily with useState(readSession): passing the FUNCTION
 *            (not readSession()) means React calls it once on the first render.
 * EFFECTS (useEffect):
 *   - Effect 1 (deps []): seeds the admin and demo accounts once at start-up.
 *   - Effect 2 (deps []): subscribes to the browser "storage" event so a
 *     login/logout in ANOTHER tab updates this tab; returns a CLEANUP function
 *     that removes the listener.
 * MEMOISATION:
 *   - useCallback on every action keeps each function's identity stable.
 *   - useMemo builds the context `value` object only when something it
 *     contains changes. Without this, every render would create a new object
 *     and force ALL context consumers to re-render.
 * ARRAY METHODS:
 *   - .filter() : in updateAccount, exclude the account being edited so it
 *                 does not clash with itself on the username check.
 *   - .find()   : locate the stored account by id.
 *   - .map()    : rebuild the users array with ONE account replaced (immutable update).
 *   - [...users, account] spread : add a new user without mutating the old array.
 * ASYNC / ERRORS:
 *   - async/await with wait(LATENCY_MS) simulates a slow server; AuthError
 *     (with an optional `field`) is thrown and caught by the form to show the
 *     message next to the right input.
 * PROPS:
 *   - AuthProvider receives one prop, `children`. It passes no props down;
 *     it publishes the context value instead (avoids "prop drilling").
 * =============================================================================
 */

// Import createContext (make a context), useCallback (stable functions), useEffect (side effects), useMemo (cache a value) and useState (state) from React.
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
// Start a named import of helpers from the auth utility file.
import {
  // AuthError: the custom error class (message + optional form field name).
  AuthError,
  // LATENCY_MS: the fake server delay (700 ms) passed to wait().
  LATENCY_MS,
  // SESSION_KEY: the storage key of the login session; compared in the storage listener.
  SESSION_KEY,
  // USERS_KEY: the storage key of the users list; used for writing and in the storage listener.
  USERS_KEY,
  // clearSession: removes the saved session (used by logout).
  clearSession,
  // ensureSeedAccounts: creates the built-in admin and demo accounts if they are missing.
  ensureSeedAccounts,
  // findByIdentifier: finds a user by exact email or username.
  findByIdentifier,
  // hashPassword: async function turning salt + password into a SHA-256 hash string.
  hashPassword,
  // loadUsers: reads the saved users array from localStorage.
  loadUsers,
  // makeId: creates a new random user id such as "u_ab12...".
  makeId,
  // makeSalt: creates a random salt for a password hash.
  makeSalt,
  // cleanIdentifier: trims surrounding spaces (case is kept).
  cleanIdentifier,
  // publicUser: returns a safe copy of an account without salt or hash.
  publicUser,
  // readSession: returns the signed-in user from storage, or null.
  readSession,
  // saveSession: stores the login session (persistent or tab-only).
  saveSession,
  // wait: returns a Promise that resolves after N milliseconds.
  wait,
  // writeStore: saves a JSON value to the chosen browser storage and returns true or false.
  writeStore,
// Close the import list and name the source file.
} from '../utils/auth.js'
// Import the shared "password equals email" error text and the checker function from the validation utilities.
import { PASSWORD_IS_EMAIL, isSameAsEmail } from '../utils/validation.js'

// Create the context with a default of null and export it; useAuth.js imports it to read the value, and a null default means "no provider found".
export const AuthContext = createContext(null)

// Export the provider component; it receives the special `children` prop (everything nested inside <AuthProvider>...</AuthProvider>).
export function AuthProvider({ children }) {
  // Read the saved session synchronously so a signed-in person never sees a login flash.
  // Create the `user` state; passing the function readSession (not calling it) makes React run it once on the first render to get the initial value (a public user object or null); setUser replaces it later.
  const [user, setUser] = useState(readSession)

  // Make sure the prototype admin and demo accounts exist as soon as the app loads.
  // Runs once on start-up. It is safe to repeat: existing accounts are never overwritten,
  // which is why React StrictMode running effects twice in development does no harm.
  // Register an effect that runs after the first render; the empty dependency array at the end means "only once on mount".
  useEffect(() => {
    // Seed the built-in accounts (async, not awaited here: fire and forget; login and signup call it again and wait for it).
    ensureSeedAccounts()
  // Empty dependency array: run once after the first render.
  }, [])

  // Keep tabs in sync: logging out (or in) in one tab updates the others.
  // Register a second effect that also runs once on mount, to listen for changes made by other tabs.
  useEffect(() => {
    // Define the event handler; `e` is the StorageEvent describing which key changed.
    const onStorage = (e) => {
      // e.key is null when storage was cleared entirely; otherwise react only to the session key or users key, and then re-read the session into state (null if logged out elsewhere).
      if (e.key === null || e.key === SESSION_KEY || e.key === USERS_KEY) setUser(readSession())
    // Close the handler function.
    }
    // Subscribe to the browser's "storage" event; it fires in OTHER tabs of the same site when localStorage changes (not in the tab that made the change).
    window.addEventListener('storage', onStorage)
    // Return a cleanup function: React runs it when the component unmounts, so the listener does not leak or stack up.
    return () => window.removeEventListener('storage', onStorage)
  // Empty dependency array: subscribe once on mount.
  }, [])

  // `email` is the login identifier: an email address or a username.
  // Define login as a memoised async function; it receives one object argument that is destructured into email (identifier), password and remember ("Remember me" checkbox).
  const login = useCallback(async ({ email, password, remember }) => {
    // Pause for 700 ms to imitate a network request (this is what makes a loading spinner visible).
    await wait(LATENCY_MS)
    // Make sure the built-in admin and demo accounts exist before we look anyone up.
    // Wait until the seed accounts exist so the "Dummy" login works even on the very first click.
    await ensureSeedAccounts()
    // Exact, case-sensitive match on the identifier (only surrounding spaces are ignored).
    // Trim the typed identifier, then search the saved users for an exact email or username match; `account` is the user object or undefined.
    const account = findByIdentifier(loadUsers(), cleanIdentifier(email))
    // If an account was found, hash the typed password with THAT account's salt; otherwise null (nothing to compare).
    const hash = account ? await hashPassword(password, account.salt) : null
    // Fail if there is no such account OR the computed hash differs from the stored hash.
    if (!account || hash !== account.hash) {
      // Same message for "no such account" and "wrong password" so accounts can't be probed.
      // Throw an AuthError with a generic message; the second argument 'password' tells the form which field to attach it to.
      throw new AuthError('Incorrect email or password. Check your details and try again.', 'password')
    // Close the failure branch.
    }
    // Store the session: Boolean(remember) converts the checkbox value to true or false (true = localStorage, false = sessionStorage).
    saveSession(account.id, Boolean(remember))
    // Update React state with the SAFE public version of the account; this re-renders every component that uses the context, and App then shows <Tracker />.
    setUser(publicUser(account))
    // Return the public user to the caller (the form).
    return publicUser(account)
  // Empty dependency array: login only uses imports and a state setter (stable), so it never needs to be recreated.
  }, [])

  // Define signup as a memoised async function; the argument object is destructured into name, email and password.
  const signup = useCallback(async ({ name, email, password }) => {
    // Simulate server latency.
    await wait(LATENCY_MS)
    // Make sure the built-in admin and demo accounts exist before we look anyone up.
    // Ensure the seed accounts exist, so a new user cannot take their identifiers first.
    await ensureSeedAccounts()
    // Read the current users list from storage.
    const users = loadUsers()
    // The email is stored exactly as typed (no silent lower-casing), and login must match
    // it exactly. Uniqueness is case-sensitive too: "Cona@gmail.com" and "cona@gmail.com"
    // are two different identifiers, so one does not block the other.
    // Trim the email (keeping its case); `key` is the identifier used for the uniqueness check and the saved email.
    const key = cleanIdentifier(email)
    // If any existing account already uses this identifier (as email OR username), refuse to create a duplicate.
    if (findByIdentifier(users, key)) {
      // Throw an error attached to the 'email' field so the form shows it under the email input.
      throw new AuthError('An account with this email already exists. Log in instead, or use a different email.', 'email')
    // Close the duplicate check.
    }
    // Server-side rule (the form checks this too, but the form alone can be bypassed).
    // Re-check that the password is not just the email; the form already checks it, but this "backend" check cannot be bypassed from the UI.
    if (isSameAsEmail(password, key)) throw new AuthError(PASSWORD_IS_EMAIL, 'password')
    // Generate a fresh random salt for this account's password.
    const salt = makeSalt()
    // Build the new account object that will be stored.
    const account = {
      // A unique random id such as "u_1a2b3c4d5e6f7a8b".
      id: makeId(),
      // Clean the display name: trim the ends and collapse any run of whitespace into a single space (the regex /\s+/g means "one or more whitespace characters, everywhere").
      name: name.trim().replace(/\s+/g, ' '),
      // Store the email exactly as typed (after trimming).
      email: key,
      // Default the username to the email; it can be changed in Settings.
      username: key, // default username; can be changed in Settings
      // New sign-ups are always normal users, never admins.
      role: 'user',
      // Store the salt (shorthand for salt: salt).
      salt,
      // Hash the typed password with the new salt; the plain password itself is never stored.
      hash: await hashPassword(password, salt),
      // Record the creation time as an ISO string.
      createdAt: new Date().toISOString(),
    // Close the account object.
    }
    // Save the users list with the new account appended ([...users, account] copies the old array and adds one item without mutating it); the `!` flips the result so the block runs when saving FAILED.
    if (!writeStore('localStorage', USERS_KEY, [...users, account])) {
      // Throw a general error (no field), shown as a form-level message.
      throw new AuthError('We could not save your account. Make sure browser storage is enabled.')
    // Close the failure check.
    }
    // Sign the new user in right away, with "remember" forced to true (persistent session).
    saveSession(account.id, true)
    // Put the safe public user into state; the app switches from <Auth /> to <Tracker />.
    setUser(publicUser(account))
    // Return the public user to the caller.
    return publicUser(account)
  // Empty dependency array: nothing here changes between renders.
  }, [])

  // Change the signed-in account's username and/or password. Needs the current password.
  // Throws AuthError (with `field` when it belongs to one input) on failure.
  // Define updateAccount as a memoised async function; the argument object is destructured into username, currentPassword and newPassword.
  const updateAccount = useCallback(async ({ username, currentPassword, newPassword }) => {
    // Simulate server latency.
    await wait(LATENCY_MS)
    // Read the session straight from storage (not from React state) so it reflects the truth even if another tab logged out.
    const session = readSession()
    // No session means nobody is logged in any more: stop with a general error.
    if (!session) throw new AuthError('Your session has expired. Log in again to change your account.')
    // .find() searches the stored users for the account whose id equals the session's id (session is a public user object, which has an id).
    const account = loadUsers().find((u) => u.id === session.id)
    // If the account no longer exists in storage, stop with an error.
    if (!account) throw new AuthError('We could not find your account. Log in again.')

    // Hash the typed current password with this account's salt and compare it with the stored hash; a mismatch means the wrong password.
    if ((await hashPassword(currentPassword, account.salt)) !== account.hash) {
      // Throw an error attached to the 'currentPassword' field.
      throw new AuthError('Your current password is incorrect.', 'currentPassword')
    // Close the password check.
    }

    // Trim spaces from the requested new username.
    const nextUsername = username.trim()
    // Exact (case-sensitive) check, skipping the account being edited.
    // .filter() builds a NEW array of users WITHOUT the current account (so you can keep your own username), then findByIdentifier looks for anyone else already using that name or email; `clash` is the conflicting user or undefined.
    const clash = findByIdentifier(loadUsers().filter((u) => u.id !== account.id), nextUsername)
    // If another account already uses it, the username is taken.
    if (clash) {
      // Throw an error attached to the 'username' field.
      throw new AuthError('That username is already taken. Choose a different one.', 'username')
    // Close the clash check.
    }

    // A new password may not equal this account's email address.
    // Only when a new password was typed (non-empty) and it equals the account's email, reject it.
    if (newPassword && isSameAsEmail(newPassword, account.email)) {
      // Throw an error attached to the 'newPassword' field, using the shared message.
      throw new AuthError(PASSWORD_IS_EMAIL, 'newPassword')
    // Close the check.
    }

    // Build the updated account as a NEW object: copy every field with spread, then overwrite the username.
    const updated = { ...account, username: nextUsername }
    // Only change the password if a new one was typed (a blank field means "keep my current password").
    if (newPassword) {
      // Create a brand-new salt for the new password.
      updated.salt = makeSalt()
      // Hash the new password with the new salt and store the hash on the updated copy.
      updated.hash = await hashPassword(newPassword, updated.salt)
    // Close the password-change block.
    }

    // Re-read right before writing so a change made in another tab is not overwritten.
    // .map() rebuilds the freshly loaded users array: the matching account (by id) is replaced by `updated`; everyone else is kept unchanged (immutable update).
    const next = loadUsers().map((u) => (u.id === account.id ? updated : u))
    // Save the new array; if writing FAILED (the ! flips the boolean), throw a general error.
    if (!writeStore('localStorage', USERS_KEY, next)) {
      // General error with no field.
      throw new AuthError('We could not save your changes. Make sure browser storage is enabled.')
    // Close the failure check.
    }
    // Update React state with the safe public version, so the header and the rest of the app show the new username straight away.
    setUser(publicUser(updated))
    // Return the public user to the caller.
    return publicUser(updated)
  // Empty dependency array: stable function.
  }, [])

  // Define logout as a memoised function (no arguments); App.jsx passes it to Tracker as the onLogout prop.
  const logout = useCallback(() => {
    // Remove the saved session from both browser storages.
    clearSession()
    // Set state to null; `user` becomes falsy, App re-renders and shows <Auth />. (Tracker's data stays saved in localStorage under its own key.)
    setUser(null)
  // Empty dependency array: stable function.
  }, [])

  // Mock only: nothing is emailed. It always resolves, whether or not the email has an account,
  // so the screen never reveals which emails are registered.
  // Define requestPasswordReset as a memoised async function; it takes no arguments (it ignores the email, which is why the screen cannot leak which emails exist).
  const requestPasswordReset = useCallback(async () => {
    // Just wait to imitate a network call, then finish (the async function returns a resolved Promise).
    await wait(LATENCY_MS)
  // Empty dependency array: stable function.
  }, [])

  // Build the context value with useMemo so the SAME object is reused until something inside it changes.
  const value = useMemo(
    // The factory function returns the object (the parentheses make the braces an object, not a function body).
    () => ({
      // The signed-in user's public data, or null.
      user,
      // Boolean(user) turns the user object or null into true or false.
      isAuthenticated: Boolean(user),
      // Optional chaining ?. avoids an error when user is null; true only when the role is 'admin'.
      isAdmin: user?.role === 'admin',
      // Share the login action.
      login,
      // Share the signup action.
      signup,
      // Share the account-update action.
      updateAccount,
      // Share the logout action.
      logout,
      // Share the password-reset action.
      requestPasswordReset,
    // Close the value object and the factory function.
    }),
    // Dependency array: recompute the value object only when `user` or any of the action functions changes (the actions are stable, so in practice only when `user` changes).
    [user, login, signup, updateAccount, logout, requestPasswordReset]
  // Close the useMemo call.
  )

  // Render the Provider: every component inside `children` can read `value` through useContext(AuthContext) (usually via useAuth()). The Provider adds no visible HTML of its own.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
// Close the AuthProvider function.
}