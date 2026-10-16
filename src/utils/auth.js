// Helpers for the mock auth backend. Everything lives in this browser's storage.
// This is a prototype: it is NOT real security. Swap these calls for a real API
// (and let the server hash passwords) before handling real accounts.

export const USERS_KEY = 'kitakita:users'
export const SESSION_KEY = 'kitakita:session'
export const LATENCY_MS = 700

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

export const publicUser = ({ id, name, email }) => ({ id, name, email })

export function loadUsers() {
  const users = readStore('localStorage', USERS_KEY)
  return Array.isArray(users) ? users : []
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
