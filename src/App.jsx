import { useEffect, useState } from 'react'
import seed from './data/transactions.json'
import Register from './components/Register.jsx'
import Dashboard from './components/Dashboard.jsx'
import History from './components/History.jsx'
import Settings from './components/Settings.jsx'
import {
  computeStats,
  cumulativeTotalCents,
  MAX_CUMULATIVE_TOTAL_CENTS,
} from './utils/finance.js'

const KEY = 'kitakita:v1'
const DEFAULTS = { tx: seed, open: 10000, cur: '₱' }

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved && Array.isArray(saved.tx)) return saved
  } catch {}
  return DEFAULTS
}

const TABS = [['reg', 'Register'], ['dash', 'Insights'], ['hist', 'History']]

export default function App() {
  const [data, setData] = useState(load)
  const [tab, setTab] = useState('reg')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
  }, [data])

  const { tx, open, cur } = data
  const stats = computeStats(tx, open)

  const addTx = (entry) => {
    const amountCents = Math.round(Number(entry.amt) * 100)

    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      return false
    }

    const currentCents = cumulativeTotalCents(data.tx, entry.type)

    if (currentCents + amountCents > MAX_CUMULATIVE_TOTAL_CENTS) {
      return false
    }

    setData((d) => ({
      ...d,
      tx: [...d.tx, { ...entry, amt: amountCents / 100, id: Date.now() }],
    }))

    return true
  }
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
        <button
          type="button"
          className="btn"
          aria-expanded={showSettings}
          aria-controls="settings-panel"
          onClick={() => setShowSettings((s) => !s)}
        >
          <span aria-hidden="true">⚙</span> Settings
        </button>
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
