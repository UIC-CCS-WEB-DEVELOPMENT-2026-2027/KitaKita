// =============================================================================
// App.jsx: the app shell.
//
// Two components live here:
//   - App      decides between the login screen (<Auth />) and the signed-in app.
//   - Tracker  the signed-in app. It owns ALL the data (transactions, opening cash,
//              currency, budget), saves it to localStorage, and passes slices of it
//              down to the tab components as props ("lifting state up").
//
// Mock data flow (this sprint):
//   src/data/mockData.json  ->  imported here  ->  seeded into the "Dummy" account
//   on first open, and also available through the "Load sample data" button.
// =============================================================================

import { useEffect, useState } from 'react'
import Auth from './components/Auth.jsx'
import Register from './components/Register.jsx'
import Dashboard from './components/Dashboard.jsx'
import History from './components/History.jsx'
import Budget from './components/Budget.jsx'
import Settings from './components/Settings.jsx'
import mockData from './data/mockData.json' // the local mockup data file (Vite imports JSON directly)
import {
  computeStats,
  cumulativeTotalCents,
  MAX_CUMULATIVE_TOTAL_CENTS,
} from './utils/finance.js'
import { LogOutIcon } from './components/Icons.jsx'
import { useAuth } from './hooks/useAuth.js'
import { DEMO_ID } from './utils/auth.js' // id of the seeded "Dummy" account

// Base key for localStorage. The signed-in user's id is appended below, so every
// account has its own separate saved data.
const KEY = 'kitakita:v1'

// Brand-new accounts start completely empty: no entries, ₱0.00 opening cash.
// It is a function (not a constant) so every call returns a fresh object that
// can be changed without affecting the next one.
const emptyState = () => ({ tx: [], open: 0, cur: '₱', budget: { weeks: {} } })

// The demo account starts with the sample entries and opening cash from mockData.json.
// Each entry is copied ({ ...t }) so the imported JSON module is never modified.
const demoState = () => ({
  ...emptyState(),
  tx: mockData.transactions.map((t) => ({ ...t })),
  open: mockData.openingCash,
})

// Read this account's saved data from the browser.
// Saved data wins. Only when nothing is saved yet does the demo account get its sample data,
// so edits, deletions and "Clear all data" are never undone by a refresh or a redeploy.
// The try/catch covers blocked storage (private mode) and corrupted JSON; in both cases
// we simply fall back to a starting state instead of crashing.
function load(key, userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (saved && Array.isArray(saved.tx)) {
      // Spread order matters: defaults first, then saved values on top. This also fills in
      // fields that older saves did not have yet (such as `budget`).
      return { ...emptyState(), ...saved, budget: saved.budget && typeof saved.budget === 'object' ? saved.budget : { weeks: {} } }
    }
  } catch {}
  return userId === DEMO_ID ? demoState() : emptyState()
}

// Tabs as [id, label] pairs, rendered with .map() in the nav below.
const TABS = [['reg', 'Register'], ['dash', 'Insights'], ['hist', 'History'], ['budget', 'Budget']]

// Sample entries come from src/data/mockData.json (ids 9001+ never clash with Date.now() ids).
const SAMPLE_TX = mockData.transactions

// The signed-in app. Each account gets its own saved data (key includes the user id).
function Tracker({ user, onLogout }) {
  const storageKey = `${KEY}:${user.id}`

  // Lazy initial state: passing a function means load() runs only once, on the first render,
  // not on every re-render.
  const [data, setData] = useState(() => load(storageKey, user.id))
  const [tab, setTab] = useState('reg')            // which tab is showing
  const [showSettings, setShowSettings] = useState(false) // is the settings panel open

  // Save to localStorage whenever the data changes. This is what makes entries survive a
  // refresh. It is browser storage, so it is per browser and per site address (it works the
  // same on localhost and on Vercel, but the two places do not share it).
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch {}
  }, [data, storageKey])

  const { tx, open, cur } = data
  // Totals, monthly figures and runway are derived from the data on every render
  // instead of being stored, so they can never disagree with the entries.
  const stats = computeStats(tx, open)

  // True once every sample entry is already in this account (the button then disables).
  // .every() + .some() = "for each sample entry, is there a saved entry with the same id?"
  const sampleLoaded = SAMPLE_TX.every((s) => tx.some((t) => t.id === s.id))

  // Add one entry. Returns false (and saves nothing) if the amount is invalid or would push
  // the running total past the limit; Register.jsx uses that to show an error message.
  // Amounts are converted to whole cents first, because decimal maths like 0.1 + 0.2
  // is not exact in JavaScript.
  const addTx = (entry) => {
    const amountCents = Math.round(Number(entry.amt) * 100)
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return false
    const currentCents = cumulativeTotalCents(data.tx, entry.type)
    if (currentCents + amountCents > MAX_CUMULATIVE_TOTAL_CENTS) return false
    // The functional form setData((d) => ...) always works from the latest data,
    // which avoids stale-state bugs when several updates happen close together.
    setData((d) => ({
      ...d,
      tx: [...d.tx, { ...entry, amt: amountCents / 100, id: Date.now() }],
    }))
    return true
  }
  // Never mutate state directly: each update below builds a NEW object/array so React notices the change.
  const deleteTx = (id) => setData((d) => ({ ...d, tx: d.tx.filter((t) => t.id !== id) }))
  const updateSettings = (patch) => setData((d) => ({ ...d, ...patch }))
  const updateBudget = (budget) => setData((d) => ({ ...d, budget }))
  // "Clear all data" resets entries and opening cash but deliberately keeps the budget plan.
  const clearAll = () => setData((d) => ({ ...emptyState(), budget: d.budget }))

  // Adds only the sample entries that are not there yet, so clicking twice never duplicates.
  // Opening cash is filled in only when it is still 0, so a balance you set yourself is kept.
  const loadSample = () =>
    setData((d) => {
      const have = new Set(d.tx.map((t) => t.id)) // ids already saved, for fast lookup
      const fresh = SAMPLE_TX.filter((s) => !have.has(s.id))
      return {
        ...d,
        tx: [...d.tx, ...fresh],
        open: d.open === 0 ? mockData.openingCash : d.open,
      }
    })

  return (
    <div className="wrap">
      {/* Accessibility: lets keyboard users jump straight past the header. */}
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="app-header">
        <div>
          <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
          <p className="tag">cash register for startups</p>
        </div>
        <div className="header-actions">
          <span className="user-name" title={user.email}>{user.name}</span>
          <button type="button" className="btn" aria-expanded={showSettings} aria-controls="settings-panel" onClick={() => setShowSettings((s) => !s)}>
            <span aria-hidden="true">⚙</span> Settings
          </button>
          <button type="button" className="btn" onClick={onLogout}><LogOutIcon /> Log out</button>
        </div>
      </header>
      {showSettings && <Settings open={open} cur={cur} onChange={updateSettings} />}
      {/* Tab buttons are generated from the TABS array with .map(). aria-current marks the active one. */}
      <nav className="tabs" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      {/* Conditional rendering: only the selected tab is mounted. Data lives here in Tracker,
          so switching tabs never loses anything. */}
      <main id="main">
        {tab === 'reg' && <Register tx={tx} stats={stats} cur={cur} onAdd={addTx} onDelete={deleteTx} />}
        {tab === 'dash' && <Dashboard stats={stats} cur={cur} hasData={tx.length > 0} />}
        {tab === 'hist' && (
          <History
            tx={tx}
            cur={cur}
            onDelete={deleteTx}
            onClear={clearAll}
            onLoadSample={loadSample}
            sampleLoaded={sampleLoaded}
          />
        )}
        {tab === 'budget' && <Budget budget={data.budget || { weeks: {} }} onChange={updateBudget} cur={cur} />}
      </main>
      <footer><p className="note">Guidance is based only on the numbers you enter and is a starting point, not financial or tax advice. Data is saved in this browser.</p></footer>
    </div>
  )
}

// Top level: signed in -> the app, signed out -> the login/sign-up screen.
// `key={user.id}` makes React rebuild Tracker from scratch when a different user logs in,
// so one account's data can never briefly show up in another account's session.
export default function App() {
  const { user, logout } = useAuth()
  return user ? <Tracker key={user.id} user={user} onLogout={logout} /> : <Auth />
}
