import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AuthError,
  LATENCY_MS,
  SESSION_KEY,
  USERS_KEY,
  clearSession,
  hashPassword,
  loadUsers,
  makeId,
  makeSalt,
  normalizeEmail,
  publicUser,
  readSession,
  saveSession,
  wait,
  writeStore,
} from '../utils/auth.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Read the saved session synchronously so a signed-in person never sees a login flash.
  const [user, setUser] = useState(readSession)

  // Keep tabs in sync: logging out (or in) in one tab updates the others.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === null || e.key === SESSION_KEY || e.key === USERS_KEY) setUser(readSession())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async ({ email, password, remember }) => {
    await wait(LATENCY_MS)
    const account = loadUsers().find((u) => u.email === normalizeEmail(email))
    const hash = account ? await hashPassword(password, account.salt) : null
    if (!account || hash !== account.hash) {
      // Same message for "no such email" and "wrong password" so accounts can't be probed.
      throw new AuthError('Incorrect email or password. Check your details and try again.', 'password')
    }
    saveSession(account.id, Boolean(remember))
    setUser(publicUser(account))
    return publicUser(account)
  }, [])

  const signup = useCallback(async ({ name, email, password }) => {
    await wait(LATENCY_MS)
    const users = loadUsers()
    const key = normalizeEmail(email)
    if (users.some((u) => u.email === key)) {
      throw new AuthError('An account with this email already exists. Log in instead, or use a different email.', 'email')
    }
    const salt = makeSalt()
    const account = {
      id: makeId(),
      name: name.trim().replace(/\s+/g, ' '),
      email: key,
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
    () => ({ user, isAuthenticated: Boolean(user), login, signup, logout, requestPasswordReset }),
    [user, login, signup, logout, requestPasswordReset]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
