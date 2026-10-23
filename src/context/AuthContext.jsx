import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AuthError,
  LATENCY_MS,
  SESSION_KEY,
  USERS_KEY,
  clearSession,
  ensureSeedAccounts,
  findByIdentifier,
  hashPassword,
  loadUsers,
  makeId,
  makeSalt,
  cleanIdentifier,
  publicUser,
  readSession,
  saveSession,
  wait,
  writeStore,
} from '../utils/auth.js'
import { PASSWORD_IS_EMAIL, isSameAsEmail } from '../utils/validation.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Read the saved session synchronously so a signed-in person never sees a login flash.
  const [user, setUser] = useState(readSession)

  // Make sure the prototype admin and demo accounts exist as soon as the app loads.
  // Runs once on start-up. It is safe to repeat: existing accounts are never overwritten,
  // which is why React StrictMode running effects twice in development does no harm.
  useEffect(() => {
    ensureSeedAccounts()
  }, [])

  // Keep tabs in sync: logging out (or in) in one tab updates the others.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === null || e.key === SESSION_KEY || e.key === USERS_KEY) setUser(readSession())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // `email` is the login identifier: an email address or a username.
  const login = useCallback(async ({ email, password, remember }) => {
    await wait(LATENCY_MS)
    // Make sure the built-in admin and demo accounts exist before we look anyone up.
    await ensureSeedAccounts()
    // Exact, case-sensitive match on the identifier (only surrounding spaces are ignored).
    const account = findByIdentifier(loadUsers(), cleanIdentifier(email))
    const hash = account ? await hashPassword(password, account.salt) : null
    if (!account || hash !== account.hash) {
      // Same message for "no such account" and "wrong password" so accounts can't be probed.
      throw new AuthError('Incorrect email or password. Check your details and try again.', 'password')
    }
    saveSession(account.id, Boolean(remember))
    setUser(publicUser(account))
    return publicUser(account)
  }, [])

  const signup = useCallback(async ({ name, email, password }) => {
    await wait(LATENCY_MS)
    // Make sure the built-in admin and demo accounts exist before we look anyone up.
    await ensureSeedAccounts()
    const users = loadUsers()
    // The email is stored exactly as typed (no silent lower-casing), and login must match
    // it exactly. Uniqueness is case-sensitive too: "Cona@gmail.com" and "cona@gmail.com"
    // are two different identifiers, so one does not block the other.
    const key = cleanIdentifier(email)
    if (findByIdentifier(users, key)) {
      throw new AuthError('An account with this email already exists. Log in instead, or use a different email.', 'email')
    }
    // Server-side rule (the form checks this too, but the form alone can be bypassed).
    if (isSameAsEmail(password, key)) throw new AuthError(PASSWORD_IS_EMAIL, 'password')
    const salt = makeSalt()
    const account = {
      id: makeId(),
      name: name.trim().replace(/\s+/g, ' '),
      email: key,
      username: key, // default username; can be changed in Settings
      role: 'user',
      salt,
      hash: await hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    }
    if (!writeStore('localStorage', USERS_KEY, [...users, account])) {
      throw new AuthError('We could not save your account. Make sure browser storage is enabled.')
    }
    saveSession(account.id, true)
    setUser(publicUser(account))
    return publicUser(account)
  }, [])

  // Change the signed-in account's username and/or password. Needs the current password.
  // Throws AuthError (with `field` when it belongs to one input) on failure.
  const updateAccount = useCallback(async ({ username, currentPassword, newPassword }) => {
    await wait(LATENCY_MS)
    const session = readSession()
    if (!session) throw new AuthError('Your session has expired. Log in again to change your account.')
    const account = loadUsers().find((u) => u.id === session.id)
    if (!account) throw new AuthError('We could not find your account. Log in again.')

    if ((await hashPassword(currentPassword, account.salt)) !== account.hash) {
      throw new AuthError('Your current password is incorrect.', 'currentPassword')
    }

    const nextUsername = username.trim()
    // Exact (case-sensitive) check, skipping the account being edited.
    const clash = findByIdentifier(loadUsers().filter((u) => u.id !== account.id), nextUsername)
    if (clash) {
      throw new AuthError('That username is already taken. Choose a different one.', 'username')
    }

    // A new password may not equal this account's email address.
    if (newPassword && isSameAsEmail(newPassword, account.email)) {
      throw new AuthError(PASSWORD_IS_EMAIL, 'newPassword')
    }

    const updated = { ...account, username: nextUsername }
    if (newPassword) {
      updated.salt = makeSalt()
      updated.hash = await hashPassword(newPassword, updated.salt)
    }

    // Re-read right before writing so a change made in another tab is not overwritten.
    const next = loadUsers().map((u) => (u.id === account.id ? updated : u))
    if (!writeStore('localStorage', USERS_KEY, next)) {
      throw new AuthError('We could not save your changes. Make sure browser storage is enabled.')
    }
    setUser(publicUser(updated))
    return publicUser(updated)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  // Mock only: nothing is emailed. It always resolves, whether or not the email has an account,
  // so the screen never reveals which emails are registered.
  const requestPasswordReset = useCallback(async () => {
    await wait(LATENCY_MS)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      signup,
      updateAccount,
      logout,
      requestPasswordReset,
    }),
    [user, login, signup, updateAccount, logout, requestPasswordReset]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
