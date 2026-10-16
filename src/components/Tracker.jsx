import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import seed from '../data/transactions.json'
import Register from './Register.jsx'
import Dashboard from './Dashboard.jsx'
import History from './History.jsx'
import Settings from './Settings.jsx'
import { LogOutIcon } from './Icons.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { computeStats } from '../utils/finance.js'

const KEY = 'kitakita:v1'
const DEFAULTS = { tx: seed, open: 10000, cur: '₱' }

function load(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (saved && Array.isArray(saved.tx)) return saved
  } catch {}
  return DEFAULTS
}

const TABS = [['reg', 'Register'], ['dash', 'Insights'], ['hist', 'History']]

// The cash register app (home page, signed-in only).
export default function Tracker() {
  const { user, logout } = useAuth()
  const storageKey = `${KEY}:${user.id}`
  const [data, setData] = useState(() => load(storageKey))
  const [tab, setTab] = useState('reg')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch {}
  }, [data, storageKey])

  const { tx, open, cur } = data
  const stats = computeStats(tx, open)

  const addTx = (entry) => setData((d) => ({ ...d, tx: [...d.tx, { ...entry, id: Date.now() }] }))
  const deleteTx = (id) => setData((d) => ({ ...d, tx: d.tx.filter((t) => t.id !== id) }))
  const updateSettings = (patch) => setData((d) => ({ ...d, ...patch }))
  const resetSample = () => setData(DEFAULTS)

  return (
    <div className="wrap">
      <a className="skip-link" href="#main">Skip to main content</a>

      <header className="app-header">
        <div>
          <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
          <p className="tag">cash register for startups</p>
        </div>
        <div className="header-actions">
          <span className="user-name" title={user.username}>{user.username}</span>
          <button
            type="button"
            className="btn"
            aria-expanded={showSettings}
            aria-controls="settings-panel"
            onClick={() => setShowSettings((s) => !s)}
          >
            <span aria-hidden="true">⚙</span> Settings
          </button>
          <Link className="btn" to="/settings">Account</Link>
          <button type="button" className="btn" onClick={logout}>
            <LogOutIcon /> Log out
          </button>
        </div>
      </header>

      {showSettings && <Settings open={open} cur={cur} onChange={updateSettings} />}

      <nav className="tabs" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <main id="main">
        {tab === 'reg' && <Register tx={tx} stats={stats} cur={cur} onAdd={addTx} onDelete={deleteTx} />}
        {tab === 'dash' && <Dashboard stats={stats} cur={cur} hasData={tx.length > 0} />}
        {tab === 'hist' && <History tx={tx} cur={cur} onDelete={deleteTx} onReset={resetSample} />}
      </main>

      <footer>
        <p className="note">
          Guidance is based only on the numbers you enter and is a starting point, not financial or tax advice.
          Data is saved in this browser.
        </p>
      </footer>
    </div>
  )
}
