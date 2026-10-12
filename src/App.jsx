import { useEffect, useState } from 'react'
import seed from './data/transactions.json'
import Register from './components/Register.jsx'
import Dashboard from './components/Dashboard.jsx'
import History from './components/History.jsx'
import Settings from './components/Settings.jsx'
import { computeStats } from './utils/finance.js'

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

  const addTx = (entry) => setData((d) => ({ ...d, tx: [...d.tx, { ...entry, id: Date.now() }] }))
  const deleteTx = (id) => setData((d) => ({ ...d, tx: d.tx.filter((t) => t.id !== id) }))
  const updateSettings = (patch) => setData((d) => ({ ...d, ...patch }))
  const resetSample = () => setData(DEFAULTS)

  return (
    <div className="wrap">
      <header>
        <div>
          <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
          <small className="tag">cash register for startups</small>
        </div>
        <button className="sm" onClick={() => setShowSettings((s) => !s)}>⚙ Settings</button>
      </header>

      {showSettings && <Settings open={open} cur={cur} onChange={updateSettings} />}

      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {tab === 'reg' && <Register tx={tx} stats={stats} cur={cur} onAdd={addTx} onDelete={deleteTx} />}
      {tab === 'dash' && <Dashboard stats={stats} cur={cur} hasData={tx.length > 0} />}
      {tab === 'hist' && <History tx={tx} cur={cur} onDelete={deleteTx} onReset={resetSample} />}

      <p className="note">
        Guidance is based only on the numbers you enter and is a starting point, not financial or tax advice.
        Data is saved in this browser.
      </p>
    </div>
  )
}
