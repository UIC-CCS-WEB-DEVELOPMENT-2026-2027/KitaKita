import { useEffect, useState } from 'react'
import Auth from './components/Auth.jsx'
import Register from './components/Register.jsx'
import Dashboard from './components/Dashboard.jsx'
import History from './components/History.jsx'
import Budget from './components/Budget.jsx'
import Settings from './components/Settings.jsx'
import mockData from './data/mockData.json'
import {
  computeStats,
  cumulativeTotalCents,
  MAX_CUMULATIVE_TOTAL_CENTS,
} from './utils/finance.js'
import { LogOutIcon } from './components/Icons.jsx'
import { useAuth } from './hooks/useAuth.js'
import { DEMO_ID } from './utils/auth.js'

const KEY = 'kitakita:v1'
// Brand-new accounts start completely empty: no entries, ₱0.00 opening cash.
const emptyState = () => ({ tx: [], open: 0, cur: '₱', budget: { weeks: {} } })

// The demo account starts with the sample entries and opening cash from mockData.json.
const demoState = () => ({
  ...emptyState(),
  tx: mockData.transactions.map((t) => ({ ...t })),
  open: mockData.openingCash,
})

// Saved data wins. Only when nothing is saved yet does the demo account get its sample data,
// so edits, deletions and "Clear all data" are never undone by a refresh or a redeploy.
function load(key, userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (saved && Array.isArray(saved.tx)) {
      return { ...emptyState(), ...saved, budget: saved.budget && typeof saved.budget === 'object' ? saved.budget : { weeks: {} } }
    }
  } catch {}
  return userId === DEMO_ID ? demoState() : emptyState()
}

const TABS = [['reg', 'Register'], ['dash', 'Insights'], ['hist', 'History'], ['budget', 'Budget']]

// Sample entries come from src/data/mockData.json (ids 9001+ never clash with Date.now() ids).
const SAMPLE_TX = mockData.transactions

// The signed-in app. Each account gets its own saved data (key includes the user id).
function Tracker({ user, onLogout }) {
  const storageKey = `${KEY}:${user.id}`
  const [data, setData] = useState(() => load(storageKey, user.id))
  const [tab, setTab] = useState('reg')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch {}
  }, [data, storageKey])

  const { tx, open, cur } = data
  const stats = computeStats(tx, open)

  // True once every sample entry is already in this account (the button then disables).
  const sampleLoaded = SAMPLE_TX.every((s) => tx.some((t) => t.id === s.id))

  const addTx = (entry) => {
    const amountCents = Math.round(Number(entry.amt) * 100)
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return false
    const currentCents = cumulativeTotalCents(data.tx, entry.type)
    if (currentCents + amountCents > MAX_CUMULATIVE_TOTAL_CENTS) return false
    setData((d) => ({
      ...d,
      tx: [...d.tx, { ...entry, amt: amountCents / 100, id: Date.now() }],
    }))
    return true
  }
  const deleteTx = (id) => setData((d) => ({ ...d, tx: d.tx.filter((t) => t.id !== id) }))
  const updateSettings = (patch) => setData((d) => ({ ...d, ...patch }))
  const updateBudget = (budget) => setData((d) => ({ ...d, budget }))
  const clearAll = () => setData((d) => ({ ...emptyState(), budget: d.budget }))

  // Adds only the sample entries that are not there yet, so clicking twice never duplicates.
  // Opening cash is filled in only when it is still 0, so a balance you set yourself is kept.
  const loadSample = () =>
    setData((d) => {
      const have = new Set(d.tx.map((t) => t.id))
      const fresh = SAMPLE_TX.filter((s) => !have.has(s.id))
      return {
        ...d,
        tx: [...d.tx, ...fresh],
        open: d.open === 0 ? mockData.openingCash : d.open,
      }
    })

  return (
    <div className="wrap">
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
      <nav className="tabs" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
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

export default function App() {
  const { user, logout } = useAuth()
  return user ? <Tracker key={user.id} user={user} onLogout={logout} /> : <Auth />
}
