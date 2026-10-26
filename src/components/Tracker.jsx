/**
 * FILE OVERVIEW: Tracker.jsx
 *
 * WHAT IT DOES:
 *   The main signed-in page of the app (the "cash register"). It owns ALL of the
 *   financial data (transactions, opening cash, currency symbol), saves it to
 *   localStorage per user, computes the stats, and renders the header, an optional
 *   Settings panel, the tab bar, and whichever tab is active.
 *
 * WHERE IT FITS:
 *   This is the "smart" parent (state owner) at the top of the app's data flow. It is
 *   shown at the home route and is wrapped by ProtectedRoute.jsx. Its children are
 *   Register, Dashboard, History and Settings. DATA FLOWS DOWN as props
 *   (tx, stats, cur, open); CHANGES FLOW UP as callbacks (onAdd, onDelete, onChange, onClear).
 *
 * REACT MECHANICS USED:
 *   - useState x3: data (object { tx, open, cur }), tab (which tab is active),
 *     showSettings (boolean)
 *   - Lazy initial state: useState(() => load(storageKey)) runs load only on the first render
 *   - useEffect: saves `data` to localStorage whenever data or storageKey changes
 *   - Functional updates: setData((d) => ...) builds new state from the previous state
 *   - Immutable updates: [...d.tx, newEntry] (add) and d.tx.filter(...) (delete)
 *   - Array methods: TABS.map(...) builds the tab buttons; d.tx.filter((t) => t.id !== id)
 *     removes one entry; tx.length > 0 is passed as hasData
 *   - Props PASSED DOWN: Register (tx, stats, cur, onAdd, onDelete), Dashboard (stats, cur,
 *     hasData), History (tx, cur, onDelete, onClear), Settings (open, cur, onChange)
 *   - Conditional rendering with && (settings panel and each tab)
 *   - Custom hook useAuth() -> user, logout; computeStats() derives totals (not stored in state)
 *   - NOTE: Date.now() as id can collide if two entries are added in the same millisecond
 *   - NOTE: addTx returns undefined, so Register's `onAdd(entry) === false` branch never runs
 */

// Import useEffect (run code after render) and useState (local state) from React
import { useEffect, useState } from 'react'
// Import Link, a router component that navigates without a full page reload
import { Link } from 'react-router-dom'
// Import the Register tab component
import Register from './Register.jsx'
// Import the Dashboard (Insights) tab component
import Dashboard from './Dashboard.jsx'
// Import the History tab component
import History from './History.jsx'
// Import the Settings panel component
import Settings from './Settings.jsx'
// Import the logout icon component
import { LogOutIcon } from './Icons.jsx'
// Import the custom hook that gives us the signed-in user and the logout function
import { useAuth } from '../hooks/useAuth.js'
// Import computeStats, the pure function that turns the transactions into totals
import { computeStats } from '../utils/finance.js'

// Base localStorage key; the user's id is appended later so each account has its own data
const KEY = 'kitakita:v1'
// Brand-new accounts start completely empty: no entries, ₱0.00 opening cash.
// Factory function returning a fresh empty data object (a function so every call gives a NEW object, not a shared one)
const emptyState = () => ({ tx: [], open: 0, cur: '₱' })

// Function that reads saved data from localStorage for a given key
function load(key) {
  // try/catch because JSON.parse or localStorage access can throw
  try {
    // Read the saved string from localStorage and parse it into an object (null if nothing is saved)
    const saved = JSON.parse(localStorage.getItem(key))
    // Only trust the saved data if it exists and its tx property is really an array
    if (saved && Array.isArray(saved.tx)) return saved
  // If anything threw, ignore the error and fall through
  } catch {}
  // Nothing valid was saved, so start with the empty state
  return emptyState()
// Close the load function
}

// Tab definitions as [id, label] pairs; each inner array is destructured later by the .map
const TABS = [['reg', 'Register'], ['dash', 'Insights'], ['hist', 'History']]

// The cash register app (home page, signed-in only).
// Export the Tracker component; it takes no props (it gets its data from hooks and storage)
export default function Tracker() {
  // Get the signed-in user object and the logout function from the auth context
  const { user, logout } = useAuth()
  // Build this user's storage key, e.g. "kitakita:v1:<userId>", so accounts do not share data
  const storageKey = `${KEY}:${user.id}`
  // STATE: data is the single object { tx, open, cur }; the initial value comes from a function (lazy initializer) so load() reads localStorage only on the first render, not on every render
  const [data, setData] = useState(() => load(storageKey))
  // STATE: tab holds the id of the visible tab and starts on 'reg' (Register)
  const [tab, setTab] = useState('reg')
  // STATE: showSettings is true when the Settings panel is open; it starts closed
  const [showSettings, setShowSettings] = useState(false)

  // EFFECT: runs after render, whenever data or storageKey changes, to persist data
  useEffect(() => {
    // Save the whole data object as JSON; try/catch guards against storage being full or blocked
    try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch {}
  // DEPENDENCY ARRAY: re-run the effect only when data or storageKey changes
  }, [data, storageKey])

  // Destructure data into three variables for easier use below (derived each render, not separate state)
  const { tx, open, cur } = data
  // DERIVED VALUE: compute the statistics (cash, monthly totals, etc.) from the transactions and opening balance on each render
  const stats = computeStats(tx, open)

  // ADD: functional update; d is the previous data. Spread d, then replace tx with a NEW array made of the old entries plus the new entry with an id from the current timestamp. Never mutates the old array, so React sees a change
  const addTx = (entry) => setData((d) => ({ ...d, tx: [...d.tx, { ...entry, id: Date.now() }] }))
  // DELETE: ARRAY ITERATION (.filter) keeps every transaction whose id is NOT the deleted id, producing a new array without that entry
  const deleteTx = (id) => setData((d) => ({ ...d, tx: d.tx.filter((t) => t.id !== id) }))
  // SETTINGS: merge a patch object (like { open: 500 } or { cur: '$' }) over the previous data
  const updateSettings = (patch) => setData((d) => ({ ...d, ...patch }))
  // CLEAR: replace everything with a fresh empty state (used by the History tab's clear action)
  const clearAll = () => setData(emptyState())

  // Return the page JSX
  return (
    // Outer page wrapper
    <div className="wrap">
      {/* Accessibility skip link: lets keyboard users jump to the element with id="main" */}
      <a className="skip-link" href="#main">Skip to main content</a>

      {/* App header element */}
      <header className="app-header">
        {/* Left part: brand and tagline */}
        <div>
          {/* Main heading with the two-part styled brand name */}
          <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
          {/* Tagline */}
          <p className="tag">cash register for startups</p>
        {/* Close the left part */}
        </div>
        {/* Right part: user name and action buttons */}
        <div className="header-actions">
          {/* Show the signed-in username; title adds a hover tooltip with the full name */}
          <span className="user-name" title={user.username}>{user.username}</span>
          {/* Settings toggle button */}
          <button
            // type="button" so it never submits a form
            type="button"
            // Styling class
            className="btn"
            // Tells assistive tech whether the controlled panel is currently open
            aria-expanded={showSettings}
            // Says which element this button controls (the Settings section's id)
            aria-controls="settings-panel"
            // STATE UPDATE: functional update flips the previous boolean (open <-> closed), which re-renders and shows/hides the panel
            onClick={() => setShowSettings((s) => !s)}
          // End of the button's opening tag
          >
            {/* Decorative gear icon hidden from screen readers, followed by the text "Settings" */}
            <span aria-hidden="true">⚙</span> Settings
          {/* Close the button */}
          </button>
          {/* Router Link (no page reload) to the /settings route, styled like a button */}
          <Link className="btn" to="/settings">Account</Link>
          {/* Log out button; onClick={logout} passes the function itself, so it runs on click (not during render) */}
          <button type="button" className="btn" onClick={logout}>
            {/* Icon component followed by the text "Log out" */}
            <LogOutIcon /> Log out
          {/* Close the log out button */}
          </button>
        {/* Close the right part */}
        </div>
      {/* Close the header */}
      </header>

      {/* CONDITIONAL RENDER: show the Settings panel only when showSettings is true. PROPS DOWN: open and cur are the data; onChange={updateSettings} lets the child report edits up to this component */}
      {showSettings && <Settings open={open} cur={cur} onChange={updateSettings} />}

      {/* Navigation landmark holding the tab buttons */}
      <nav className="tabs" aria-label="Sections">
        {/* ARRAY ITERATION (.map): each [id, label] pair in TABS is destructured and becomes one button; key={id} gives each button a unique identity */}
        {TABS.map(([id, label]) => (
          // Tab button: aria-current marks the active tab as 'page' (undefined removes the attribute for the others); clicking sets tab state to this button's id, which re-renders and switches the shown tab
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {/* The tab's visible text */}
            {label}
          {/* Close the tab button */}
          </button>
        // Close the arrow function's parentheses and the map call
        ))}
      {/* Close the nav */}
      </nav>

      {/* Main landmark; id="main" is the skip link's target */}
      <main id="main">
        {/* CONDITIONAL RENDER by tab: only the Register tab when tab is 'reg'. PROPS DOWN: tx, stats, cur; CALLBACKS UP: onAdd (addTx) and onDelete (deleteTx) */}
        {tab === 'reg' && <Register tx={tx} stats={stats} cur={cur} onAdd={addTx} onDelete={deleteTx} />}
        {/* Insights tab; hasData is a boolean (tx.length > 0) so the child can show an empty state */}
        {tab === 'dash' && <Dashboard stats={stats} cur={cur} hasData={tx.length > 0} />}
        {/* History tab; it receives the full tx array and callbacks for deleting one entry and clearing all */}
        {tab === 'hist' && <History tx={tx} cur={cur} onDelete={deleteTx} onClear={clearAll} />}
      {/* Close main */}
      </main>

      {/* Page footer */}
      <footer>
        {/* Disclaimer note */}
        <p className="note">
          {/* First part of the disclaimer text */}
          Guidance is based only on the numbers you enter and is a starting point, not financial or tax advice.
          {/* Second part: where the data is stored */}
          Data is saved in this browser.
        {/* Close the note */}
        </p>
      {/* Close the footer */}
      </footer>
    {/* Close the page wrapper */}
    </div>
  // Close the parentheses around the returned JSX
  )
// Close the Tracker function body
}