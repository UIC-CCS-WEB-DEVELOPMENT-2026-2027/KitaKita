/*
 * =============================================================================
 * FILE OVERVIEW: auth.js (utils/auth.js)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * auth.js is a plain JavaScript helper module (NOT a React component, no JSX)
 * that fakes an authentication backend using the browser's storage. It:
 *   - stores keys/constants (USERS_KEY, SESSION_KEY, LATENCY_MS, ADMIN_ID, DEMO_ID),
 *   - safely reads/writes/removes JSON in localStorage or sessionStorage,
 *   - creates random salts and ids, and hashes passwords (SHA-256, with a fallback),
 *   - finds users by email or username,
 *   - seeds the built-in "Administrator" and "Dummy" demo accounts,
 *   - saves, reads and clears the login session.
 * It is a prototype: it is NOT real security (the file's own header says so).
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   context/AuthContext.jsx   imports these helpers. It owns the React state
 *                             (the current `user`) and calls ensureSeedAccounts(),
 *                             readSession(), saveSession(), clearSession(), etc.
 *   hooks/useAuth.js          reads that context for components.
 *   App.jsx                   imports DEMO_ID to decide who may load sample data.
 *   components/Auth.jsx       the login/sign-up form uses these through the context.
 * This file holds the data-access logic. The React state lives elsewhere.
 *
 * PRIMARY MECHANICS USED
 * ----------------------
 *   - No React hooks and no props here. State flow: AuthContext keeps the
 *     `user` in useState; these functions read/write storage and return plain
 *     values that AuthContext then puts into state.
 *   - Array iteration:
 *       .find()       -> locate one user (by id, username or email),
 *       .some()       -> check whether an id already exists,
 *       .map()        -> rebuild the users array with one user changed (immutable update),
 *       Array.from()  -> convert bytes to an array of hex strings (with a map function),
 *       [...users, newUser] spread -> add a user without mutating the old array.
 *   - async/await and Promises: hashing (crypto.subtle.digest) is asynchronous,
 *     and wait() simulates network latency.
 *   - try/catch: every storage access can throw (private mode, blocked cookies).
 *   - class AuthError extends Error: a custom error carrying a `field` name so
 *     the form can show the message next to the right input.
 *   - JS gotcha to know for the defense: some older comments in this file say
 *     login "ignores letter case"; the actual code (cleanIdentifier +
 *     findByIdentifier) matches EXACTLY, so "dummy" will NOT log in as "Dummy".
 * =============================================================================
 */

// Helpers for the mock auth backend. Everything lives in this browser's storage.
// This is a prototype: it is NOT real security. Swap these calls for a real API
// (and let the server hash passwords) before handling real accounts.

// Export the localStorage key under which the full list of registered users is saved.
export const USERS_KEY = 'kitakita:users'
// Export the key under which the current login session ({ userId }) is saved.
export const SESSION_KEY = 'kitakita:session'
// Export the fake network delay in milliseconds (700 ms) used with wait() to simulate a slow server.
export const LATENCY_MS = 700

// Prototype administrator (testing/demo only). Credentials are visible in source,
// so remove this seed before handling real accounts.
// Export the fixed id of the admin account, so the code can always recognise it.
export const ADMIN_ID = 'u_admin'
// Module-private constant: the admin's login username (not exported, so other files cannot import it).
const ADMIN_USERNAME = 'Secret123'
// Module-private constant: the admin's current default password.
const ADMIN_PASSWORD = '123'
// Module-private constant: the admin's older default password, used to detect and upgrade old saved accounts.
const LEGACY_ADMIN_PASSWORD = 'Secret' // earlier default; upgraded automatically below

// Demo account (testing/demo only). Log in with username "Dummy" and password "123".
// Its register is pre-filled with src/data/mockData.json the first time it opens (see App.jsx).
// Credentials are visible in source, so remove this seed before handling real accounts.
//
// Why a fixed id: App.jsx compares the signed-in user's id with DEMO_ID to decide whether
// to pre-fill sample data. It is separate from ADMIN_ID, so the admin account stays clean.
// Why this works on localhost AND Vercel: the account is created by code at app start-up,
// inside each browser's own localStorage, so no server or deployment setting is involved.
// Export the fixed id of the demo account; App.jsx imports it to compare against user.id.
export const DEMO_ID = 'u_demo'
// Module-private constant: the demo account's username.
const DEMO_USERNAME = 'Dummy'
// Module-private constant: the demo account's password.
const DEMO_PASSWORD = '123'

// Export a custom error class; it extends the built-in Error so it works with try/catch and `instanceof`.
export class AuthError extends Error {
  // The constructor runs on `new AuthError(message, field)`; `message` is the text, `field` is the optional form field name.
  constructor(message, field) {
    // Call the parent Error constructor so the standard `message` property is set.
    super(message)
    // Give the error a recognisable name instead of the default "Error".
    this.name = 'AuthError'
    // Store which form field the problem belongs to, so the UI can highlight that input.
    this.field = field // which form field the problem belongs to, if any
  // Close the constructor.
  }
// Close the class.
}

// kind is 'localStorage' or 'sessionStorage'. Touching either can throw
// (blocked cookies, private modes), so every access happens inside try/catch.
// Export readStore: returns the parsed value saved under `key` in the chosen storage, or null on failure.
export function readStore(kind, key) {
  // Begin try: storage access or JSON parsing may throw.
  try {
    // window[kind] picks localStorage or sessionStorage by name; getItem reads the string; JSON.parse turns it into a value (null if the key is missing).
    return JSON.parse(window[kind].getItem(key))
  // Catch any error (blocked storage, invalid JSON).
  } catch {
    // On failure, return null so callers treat it as "nothing saved".
    return null
  // Close the catch block.
  }
// Close readStore.
}

// Export writeStore: saves `value` as JSON text under `key`; returns true on success and false on failure.
export function writeStore(kind, key, value) {
  // Begin try: setItem can throw (storage full or blocked).
  try {
    // Convert the value to a JSON string and store it in the chosen storage.
    window[kind].setItem(key, JSON.stringify(value))
    // Report success to the caller.
    return true
  // Catch any storage error.
  } catch {
    // Report failure; saveSession uses this to decide whether to throw an AuthError.
    return false
  // Close the catch block.
  }
// Close writeStore.
}

// Export removeStore: deletes `key` from the chosen storage.
export function removeStore(kind, key) {
  // Begin try: removeItem can throw if storage is blocked.
  try {
    // Remove the saved item from the chosen storage.
    window[kind].removeItem(key)
  // Swallow any error silently; nothing else needs to happen.
  } catch {}
// Close removeStore.
}

// Export wait: an arrow function that returns a Promise resolving after `ms` milliseconds (simulated server delay; used with await).
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Export normalizeEmail: trims surrounding spaces and lower-cases an email address.
export const normalizeEmail = (email) => email.trim().toLowerCase()

// Declare randomHex (module-private): returns a random hexadecimal string made from `bytes` random bytes.
function randomHex(bytes) {
  // Create a typed array of `bytes` unsigned 8-bit numbers (all start at 0).
  const arr = new Uint8Array(bytes)
  // If the browser has the secure random generator (optional chaining ?. avoids an error if crypto is missing), fill the array with cryptographically strong random bytes.
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(arr)
  // Otherwise fall back to a weaker Math.random loop that fills each slot with a number from 0 to 255.
  else for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256)
  // Array.from with a map function turns each byte into a 2-character hex string (padStart adds a leading 0), then .join('') glues them into one string.
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
// Close randomHex.
}

// Export makeSalt: a random 32-character hex string (16 bytes), added to a password before hashing.
export const makeSalt = () => randomHex(16)
// Export makeId: builds a unique-looking user id such as "u_ab12cd34ef56ab78".
export const makeId = () => 'u_' + randomHex(8)

// Export hashPassword: async, so it returns a Promise; it turns salt + password into a hash string.
export async function hashPassword(password, salt) {
  // Join salt and password as "salt:password" and encode the text into bytes (a Uint8Array) for hashing.
  const data = new TextEncoder().encode(`${salt}:${password}`)
  // Use the browser's SubtleCrypto only if it exists (it needs a secure context such as https or localhost).
  if (window.crypto?.subtle) {
    // await pauses until the SHA-256 digest finishes and gives back an ArrayBuffer.
    const buf = await window.crypto.subtle.digest('SHA-256', data)
    // Convert the buffer to bytes, turn each byte into 2 hex characters with Array.from's map function, and join them into the final hash string.
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  // Close the if block.
  }
  // Fallback for non-secure contexts where SubtleCrypto is unavailable (FNV-1a).
  // Start the FNV-1a hash with its standard offset-basis number.
  let h = 2166136261
  // Loop over every byte in `data` (for...of iterates the values of the typed array).
  for (const b of data) {
    // XOR the current hash with the byte to mix it in.
    h ^= b
    // Multiply by the FNV prime; Math.imul keeps the result a 32-bit integer.
    h = Math.imul(h, 16777619)
  // Close the for loop.
  }
  // Convert h to an unsigned 32-bit number (>>> 0), write it in hex, and prefix it with "fnv" so a fallback hash is recognisable.
  return 'fnv' + (h >>> 0).toString(16)
// Close hashPassword.
}

// Older accounts have no username or role: fall back to the email and a normal user.
// Export publicUser: takes a full stored account (destructuring picks 5 fields) and returns a SAFE copy without salt or hash.
export const publicUser = ({ id, name, email, username, role }) => ({
  // Keep the account id (App.jsx uses it as user.id).
  id,
  // Keep the display name shown in the app header.
  name,
  // Keep the email (shown as a tooltip in the header).
  email,
  // Use the username, or fall back to the email for older accounts that have none.
  username: username || email,
  // Use the role, or fall back to 'user' for older accounts that have none.
  role: role || 'user',
// Close the returned object and the function.
})

// Export loadUsers: returns the saved users array, or an empty array if nothing valid is saved.
export function loadUsers() {
  // Read the saved users from localStorage (null if missing or unreadable).
  const users = readStore('localStorage', USERS_KEY)
  // Array.isArray guards against corrupted data: return the saved array only if it really is one; otherwise return [].
  return Array.isArray(users) ? users : []
// Close loadUsers.
}

// CASE SENSITIVITY. Identifiers (email or username) are matched EXACTLY everywhere: only
// surrounding spaces are ignored, letter case counts. "Dummy" can log in, "dummy" cannot,
// and "Cona@gmail.com" and "cona@gmail.com" can both be registered as separate accounts.
// (Passwords were already case-sensitive because the hash differs for any change.)
// Export cleanIdentifier: removes only leading and trailing spaces; letter case is kept.
export const cleanIdentifier = (value) => value.trim()

// Find an account by EXACT email OR username (case-sensitive). Used by login, by the
// sign-up "already registered" check and by the username-taken check.
// Export findByIdentifier: searches the `users` array for one account matching `key`.
export function findByIdentifier(users, key) {
  // If key is empty (or missing), return undefined immediately; this avoids accidentally matching accounts that have an empty email, like the demo and admin accounts.
  if (!key) return undefined
  // .find() walks the array and returns the FIRST user whose username or email equals key exactly (or undefined if none does).
  return users.find((u) => u.username === key || u.email === key)
// Close findByIdentifier.
}


// Creates the prototype admin the first time it is needed. Safe to call repeatedly:
// once the account exists (even after the admin edits it in Settings) it is left alone.
// Export ensureAdminAccount: async because hashing is asynchronous.
export async function ensureAdminAccount() {
  // .find() looks for a saved user whose id is the admin id (undefined if there is none yet).
  const existing = loadUsers().find((u) => u.id === ADMIN_ID)
  // If the admin already exists, only check whether it needs a password upgrade.
  if (existing) {
    // An admin still on the earlier default password is moved to the current one.
    // An admin whose password was changed by hand is left alone.
    // Hash the OLD default password with this admin's salt; if it equals the stored hash, the admin still uses the old password.
    if (existing.hash === (await hashPassword(LEGACY_ADMIN_PASSWORD, existing.salt))) {
      // Make a brand-new random salt for the upgraded password.
      const newSalt = makeSalt()
      // Hash the current default password with that new salt.
      const newHash = await hashPassword(ADMIN_PASSWORD, newSalt)
      // Save the updated users list back to localStorage.
      writeStore(
        // Write to localStorage...
        'localStorage',
        // ...under the users key...
        USERS_KEY,
        // .map() rebuilds the array: for the admin, create a NEW object with the new salt and hash ({ ...u, ... } copies the rest); every other user is passed through unchanged. This is an immutable update.
        loadUsers().map((u) => (u.id === ADMIN_ID ? { ...u, salt: newSalt, hash: newHash } : u))
      // Close the writeStore call.
      )
    // Close the inner if block.
    }
    // Stop here: the admin exists, so there is nothing to create.
    return
  // Close the outer if block.
  }
  // The admin does not exist yet: generate a random salt for its password.
  const salt = makeSalt()
  // Hash the default admin password together with that salt (the plain password itself is never stored).
  const hash = await hashPassword(ADMIN_PASSWORD, salt)
  // Read the users list again because other code may have changed it during the async hashing above.
  const users = loadUsers() // re-read: another call may have finished while hashing
  // .some() returns true if any user already has the admin id; if so, stop to avoid creating a duplicate.
  if (users.some((u) => u.id === ADMIN_ID)) return
  // Save the users list with the new admin added.
  writeStore('localStorage', USERS_KEY, [
    // Spread copies every existing user into the new array (no mutation of the old one).
    ...users,
    // Start the new admin account object.
    {
      // Fixed admin id.
      id: ADMIN_ID,
      // Display name.
      name: 'Administrator',
      // No email: this account logs in by username.
      email: '',
      // Login username for the admin.
      username: ADMIN_USERNAME,
      // Role marks this as an administrator.
      role: 'admin',
      // Store the random salt (shorthand for salt: salt).
      salt,
      // Store the hash (shorthand for hash: hash).
      hash,
      // Record when the account was created, as an ISO date string.
      createdAt: new Date().toISOString(),
    // Close the new admin object.
    },
  // Close the array and the writeStore call.
  ])
// Close ensureAdminAccount.
}

// Creates the demo account the first time it is needed. Once it exists it is left alone,
// even if its password or username is changed later in Settings.
// Export ensureDemoAccount: async because hashing is asynchronous.
export async function ensureDemoAccount() {
  // Fast exit: the account is already there, so do nothing (this is what makes it safe
  // to call on every page load and every login).
  // .some() checks whether any saved user has the demo id; if yes, return immediately.
  if (loadUsers().some((u) => u.id === DEMO_ID)) return
  // Same storage format as real accounts: a random salt plus a SHA-256 hash.
  // The password "123" itself is never stored.
  // Generate a random salt for the demo password.
  const salt = makeSalt()
  // Hash the demo password with the salt (waits for the async hash).
  const hash = await hashPassword(DEMO_PASSWORD, salt)
  // Read the users list again in case it changed during the async gap.
  const users = loadUsers() // re-read: another call may have finished while hashing
  // Second duplicate check after the async gap: stop if the demo account appeared in the meantime.
  if (users.some((u) => u.id === DEMO_ID)) return // second check after the async gap
  // Save the users list with the demo account added.
  writeStore('localStorage', USERS_KEY, [
    // Spread the existing users into the new array.
    ...users,
    // Start the new demo account object.
    {
      // Fixed demo id; App.jsx compares user.id to this to allow sample data.
      id: DEMO_ID,
      // Display name for the header.
      name: 'Dummy',            // shown in the app header
      // Empty email, so this account is matched by username only.
      email: '',                // no email: this account logs in by username only
      // Username used to log in.
      username: DEMO_USERNAME,  // login matching ignores letter case ("dummy" works too)
      // Normal user role, not an administrator.
      role: 'user',             // a normal user, NOT an administrator
      // Store the salt.
      salt,
      // Store the hash.
      hash,
      // Record the creation time as an ISO date string.
      createdAt: new Date().toISOString(),
    // Close the demo account object.
    },
  // Close the array and the writeStore call.
  ])
// Close ensureDemoAccount.
}

// One call that makes sure every built-in account exists. Run in order (await each one)
// so the two read-modify-write updates of the users list never overlap and overwrite
// each other. AuthContext calls this at start-up, at login and at sign-up.
// Export ensureSeedAccounts: async wrapper that seeds all built-in accounts.
export async function ensureSeedAccounts() {
  // Wait for the admin account to be ensured first.
  await ensureAdminAccount()
  // Only then ensure the demo account, so the two writes never overlap.
  await ensureDemoAccount()
// Close ensureSeedAccounts.
}

// Session lives in sessionStorage (ends with the tab) unless "Remember me" was
// ticked, in which case it lives in localStorage (survives closing the browser).
// Export readSession: returns the signed-in user (public fields only) or null if nobody is signed in.
export function readSession() {
  // Try sessionStorage first; if that returns a falsy value, try localStorage (the || picks the first truthy result).
  const s = readStore('sessionStorage', SESSION_KEY) || readStore('localStorage', SESSION_KEY)
  // If no session was found, or it has no userId, nobody is signed in: return null.
  if (!s || !s.userId) return null
  // .find() searches the saved users for the account whose id matches the session's userId.
  const account = loadUsers().find((u) => u.id === s.userId)
  // If the account still exists, return its SAFE public version (no salt or hash); otherwise return null (the account was deleted).
  return account ? publicUser(account) : null
// Close readSession.
}

// Export saveSession: stores the login session; `remember` chooses localStorage (persistent) or sessionStorage (tab only).
export function saveSession(userId, remember) {
  // Remove any old session from sessionStorage so two sessions never conflict.
  removeStore('sessionStorage', SESSION_KEY)
  // Remove any old session from localStorage too.
  removeStore('localStorage', SESSION_KEY)
  // Write { userId } to localStorage if "Remember me" is ticked, otherwise to sessionStorage; `ok` is true or false.
  const ok = writeStore(remember ? 'localStorage' : 'sessionStorage', SESSION_KEY, { userId })
  // If saving failed, throw an AuthError; AuthContext/Auth.jsx catches it and shows the message.
  if (!ok) throw new AuthError('We could not keep you signed in. Make sure browser storage is enabled.')
// Close saveSession.
}

// Export clearSession: used by logout to delete the session from both storages.
export function clearSession() {
  // Remove the session from sessionStorage.
  removeStore('sessionStorage', SESSION_KEY)
  // Remove the session from localStorage.
  removeStore('localStorage', SESSION_KEY)
// Close clearSession.
}