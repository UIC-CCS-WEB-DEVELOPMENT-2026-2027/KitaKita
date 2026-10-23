// Helpers for the mock auth backend. Everything lives in this browser's storage.
// This is a prototype: it is NOT real security. Swap these calls for a real API
// (and let the server hash passwords) before handling real accounts.

export const USERS_KEY = 'kitakita:users'
export const SESSION_KEY = 'kitakita:session'
export const LATENCY_MS = 700

// Prototype administrator (testing/demo only). Credentials are visible in source,
// so remove this seed before handling real accounts.
export const ADMIN_ID = 'u_admin'
const ADMIN_USERNAME = 'Secret123'
const ADMIN_PASSWORD = '123'
const LEGACY_ADMIN_PASSWORD = 'Secret' // earlier default; upgraded automatically below

// Demo account (testing/demo only). Log in with username "Dummy" and password "123".
// Its register is pre-filled with src/data/mockData.json the first time it opens (see App.jsx).
// Credentials are visible in source, so remove this seed before handling real accounts.
//
// Why a fixed id: App.jsx compares the signed-in user's id with DEMO_ID to decide whether
// to pre-fill sample data. It is separate from ADMIN_ID, so the admin account stays clean.
// Why this works on localhost AND Vercel: the account is created by code at app start-up,
// inside each browser's own localStorage, so no server or deployment setting is involved.
export const DEMO_ID = 'u_demo'
const DEMO_USERNAME = 'Dummy'
const DEMO_PASSWORD = '123'

export class AuthError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'AuthError'
    this.field = field // which form field the problem belongs to, if any
  }
}

// kind is 'localStorage' or 'sessionStorage'. Touching either can throw
// (blocked cookies, private modes), so every access happens inside try/catch.
export function readStore(kind, key) {
  try {
    return JSON.parse(window[kind].getItem(key))
  } catch {
    return null
  }
}

export function writeStore(kind, key, value) {
  try {
    window[kind].setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStore(kind, key) {
  try {
    window[kind].removeItem(key)
  } catch {}
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const normalizeEmail = (email) => email.trim().toLowerCase()

function randomHex(bytes) {
  const arr = new Uint8Array(bytes)
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(arr)
  else for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const makeSalt = () => randomHex(16)
export const makeId = () => 'u_' + randomHex(8)

export async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  if (window.crypto?.subtle) {
    const buf = await window.crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback for non-secure contexts where SubtleCrypto is unavailable (FNV-1a).
  let h = 2166136261
  for (const b of data) {
    h ^= b
    h = Math.imul(h, 16777619)
  }
  return 'fnv' + (h >>> 0).toString(16)
}

// Older accounts have no username or role: fall back to the email and a normal user.
export const publicUser = ({ id, name, email, username, role }) => ({
  id,
  name,
  email,
  username: username || email,
  role: role || 'user',
})

export function loadUsers() {
  const users = readStore('localStorage', USERS_KEY)
  return Array.isArray(users) ? users : []
}

// Find an account by normalised (trimmed, lower-case) email OR username.
export function findByIdentifier(users, key) {
  if (!key) return undefined
  return users.find((u) => normalizeEmail(u.username || '') === key || u.email === key)
}

// Creates the prototype admin the first time it is needed. Safe to call repeatedly:
// once the account exists (even after the admin edits it in Settings) it is left alone.
export async function ensureAdminAccount() {
  const existing = loadUsers().find((u) => u.id === ADMIN_ID)
  if (existing) {
    // An admin still on the earlier default password is moved to the current one.
    // An admin whose password was changed by hand is left alone.
    if (existing.hash === (await hashPassword(LEGACY_ADMIN_PASSWORD, existing.salt))) {
      const newSalt = makeSalt()
      const newHash = await hashPassword(ADMIN_PASSWORD, newSalt)
      writeStore(
        'localStorage',
        USERS_KEY,
        loadUsers().map((u) => (u.id === ADMIN_ID ? { ...u, salt: newSalt, hash: newHash } : u))
      )
    }
    return
  }
  const salt = makeSalt()
  const hash = await hashPassword(ADMIN_PASSWORD, salt)
  const users = loadUsers() // re-read: another call may have finished while hashing
  if (users.some((u) => u.id === ADMIN_ID)) return
  writeStore('localStorage', USERS_KEY, [
    ...users,
    {
      id: ADMIN_ID,
      name: 'Administrator',
      email: '',
      username: ADMIN_USERNAME,
      role: 'admin',
      salt,
      hash,
      createdAt: new Date().toISOString(),
    },
  ])
}

// Creates the demo account the first time it is needed. Once it exists it is left alone,
// even if its password or username is changed later in Settings.
export async function ensureDemoAccount() {
  // Fast exit: the account is already there, so do nothing (this is what makes it safe
  // to call on every page load and every login).
  if (loadUsers().some((u) => u.id === DEMO_ID)) return
  // Same storage format as real accounts: a random salt plus a SHA-256 hash.
  // The password "123" itself is never stored.
  const salt = makeSalt()
  const hash = await hashPassword(DEMO_PASSWORD, salt)
  const users = loadUsers() // re-read: another call may have finished while hashing
  if (users.some((u) => u.id === DEMO_ID)) return // second check after the async gap
  writeStore('localStorage', USERS_KEY, [
    ...users,
    {
      id: DEMO_ID,
      name: 'Dummy',            // shown in the app header
      email: '',                // no email: this account logs in by username only
      username: DEMO_USERNAME,  // login matching ignores letter case ("dummy" works too)
      role: 'user',             // a normal user, NOT an administrator
      salt,
      hash,
      createdAt: new Date().toISOString(),
    },
  ])
}

// One call that makes sure every built-in account exists. Run in order (await each one)
// so the two read-modify-write updates of the users list never overlap and overwrite
// each other. AuthContext calls this at start-up, at login and at sign-up.
export async function ensureSeedAccounts() {
  await ensureAdminAccount()
  await ensureDemoAccount()
}

// Session lives in sessionStorage (ends with the tab) unless "Remember me" was
// ticked, in which case it lives in localStorage (survives closing the browser).
export function readSession() {
  const s = readStore('sessionStorage', SESSION_KEY) || readStore('localStorage', SESSION_KEY)
  if (!s || !s.userId) return null
  const account = loadUsers().find((u) => u.id === s.userId)
  return account ? publicUser(account) : null
}

export function saveSession(userId, remember) {
  removeStore('sessionStorage', SESSION_KEY)
  removeStore('localStorage', SESSION_KEY)
  const ok = writeStore(remember ? 'localStorage' : 'sessionStorage', SESSION_KEY, { userId })
  if (!ok) throw new AuthError('We could not keep you signed in. Make sure browser storage is enabled.')
}

export function clearSession() {
  removeStore('sessionStorage', SESSION_KEY)
  removeStore('localStorage', SESSION_KEY)
}
