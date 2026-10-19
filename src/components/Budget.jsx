import { useMemo, useState } from 'react'
import { formatDate, money, todayISO } from '../utils/finance.js'

const blankEntry = (date = todayISO()) => ({ id: null, date, type: 'income', desc: '', amt: '' })
const pad = (n) => String(n).padStart(2, '0')
const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

function startOfWeek(value) {
  const d = new Date(`${value}T12:00:00`)
  const day = d.getDay()
  d.setDate(d.getDate() - ((day + 6) % 7))
  return iso(d)
}

function addDays(value, amount) {
  const d = new Date(`${value}T12:00:00`)
  d.setDate(d.getDate() + amount)
  return iso(d)
}

function displayRange(start) {
  const end = addDays(start, 6)
  return `${formatDate(start)} – ${formatDate(end)}`
}

function safeWeek(weeks, start) {
  const week = weeks?.[start]
  return {
    startingCash: Number.isFinite(Number(week?.startingCash)) ? Number(week.startingCash) : 0,
    entries: Array.isArray(week?.entries) ? week.entries : [],
  }
}

export default function Budget({ budget, onChange, cur }) {
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [draft, setDraft] = useState(() => blankEntry())
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const weekStart = startOfWeek(selectedDate)
  const week = safeWeek(budget?.weeks, weekStart)
  const entries = useMemo(
    () => [...week.entries].sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id))),
    [week.entries],
  )
  const income = entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amt || 0), 0)
  const expenses = entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amt || 0), 0)
  const net = income - expenses
  const projectedCash = Number(week.startingCash || 0) + net
  const m = (value) => money(value, cur)

  function saveWeek(patch) {
    onChange({
      ...budget,
      weeks: {
        ...(budget?.weeks || {}),
        [weekStart]: { ...week, ...patch },
      },
    })
  }

  function resetDraft() {
    setDraft(blankEntry(weekStart))
    setEditingId(null)
    setError('')
  }

  function submitEntry(event) {
    event.preventDefault()
    const amount = Number(draft.amt)
    if (!draft.desc.trim()) return setError('Enter a description for this planned cash movement.')
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.')
    if (draft.date < weekStart || draft.date > addDays(weekStart, 6)) return setError('Choose a date within the selected week.')
    const entry = {
      id: editingId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: draft.date,
      type: draft.type,
      desc: draft.desc.trim(),
      amt: Math.round(amount * 100) / 100,
    }
    const next = editingId == null
      ? [...week.entries, entry]
      : week.entries.map((item) => item.id === editingId ? entry : item)
    saveWeek({ entries: next })
    resetDraft()
  }

  function editEntry(entry) {
    setDraft({ ...entry, amt: String(entry.amt) })
    setEditingId(entry.id)
    setError('')
  }

  function deleteEntry(id) {
    if (!window.confirm('Delete this planned cash movement?')) return
    saveWeek({ entries: week.entries.filter((entry) => entry.id !== id) })
    if (editingId === id) resetDraft()
  }

  function changeWeek(amount) {
    setSelectedDate(addDays(weekStart, amount * 7))
    resetDraft()
  }

  return (
    <div className="budget-page">
      <section className="card" aria-labelledby="budget-title">
        <div className="card-head">
          <div>
            <h2 id="budget-title">Weekly cash-flow budget</h2>
            <p className="hint">Plan expected cash movements before they happen. These plans do not change your actual register totals.</p>
          </div>
        </div>
        <div className="budget-week-controls">
          <button type="button" className="btn" onClick={() => changeWeek(-1)} aria-label="Previous week">← Previous</button>
          <label className="budget-date-field">Choose a date in the week
            <input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value || todayISO()); resetDraft() }} />
          </label>
          <button type="button" className="btn" onClick={() => changeWeek(1)} aria-label="Next week">Next →</button>
        </div>
        <p className="budget-range">Week of {displayRange(weekStart)}</p>
        <div className="field budget-starting-cash">
          <label htmlFor="budget-start-cash">Starting cash for this week</label>
          <div className="amount-wrap">
            <span className="amount-cur" aria-hidden="true">{cur}</span>
            <input
              id="budget-start-cash"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={week.startingCash}
              onChange={(event) => {
                const value = event.target.value
                if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)) saveWeek({ startingCash: value === '' ? 0 : Math.round(Number(value) * 100) / 100 })
              }}
            />
          </div>
          <p className="hint">Enter the cash you expect to have at the beginning of this week.</p>
        </div>
      </section>

      <dl className="stats stats-3 budget-stats">
        <div className="stat"><dt>Planned income</dt><dd className="is-pos">{m(income)}</dd></div>
        <div className="stat"><dt>Planned expenses</dt><dd className="is-neg">{m(expenses)}</dd></div>
        <div className="stat"><dt>Net planned flow</dt><dd className={net < 0 ? 'is-neg' : 'is-pos'}>{m(net)}</dd></div>
      </dl>

      <section className="card" aria-labelledby="projection-title">
        <h2 id="projection-title">Projected ending cash</h2>
        <p className={`budget-projection${projectedCash < 0 ? ' is-neg' : ' is-pos'}`}>{m(projectedCash)}</p>
        {projectedCash < 0
          ? <p className="budget-warning" role="status">Shortfall warning: your planned expenses exceed your starting cash and planned income by {m(Math.abs(projectedCash))}.</p>
          : <p className="hint">Starting cash + planned income − planned expenses.</p>}
      </section>

      <section className="card" aria-labelledby="planned-entry-title">
        <h2 id="planned-entry-title">{editingId == null ? 'Add a planned cash movement' : 'Edit planned cash movement'}</h2>
        <form onSubmit={submitEntry}>
          <div className="seg budget-type-toggle" role="group" aria-label="Cash movement type">
            <button type="button" className="is-sale" aria-pressed={draft.type === 'income'} onClick={() => setDraft((d) => ({ ...d, type: 'income' }))}><span>Planned income</span><small>Cash expected in</small></button>
            <button type="button" className="is-expense" aria-pressed={draft.type === 'expense'} onClick={() => setDraft((d) => ({ ...d, type: 'expense' }))}><span>Planned expense</span><small>Cash expected out</small></button>
          </div>
          <div className="field">
            <label htmlFor="budget-desc">Description</label>
            <input id="budget-desc" value={draft.desc} maxLength={120} onChange={(event) => setDraft((d) => ({ ...d, desc: event.target.value }))} placeholder="e.g. Supplier payment, customer invoice" required />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="budget-amount">Amount</label>
              <input id="budget-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.amt} onChange={(event) => setDraft((d) => ({ ...d, amt: event.target.value }))} placeholder="0.00" required />
            </div>
            <div className="field">
              <label htmlFor="budget-entry-date">Planned date</label>
              <input id="budget-entry-date" type="date" min={weekStart} max={addDays(weekStart, 6)} value={draft.date} onChange={(event) => setDraft((d) => ({ ...d, date: event.target.value }))} required />
            </div>
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="actions budget-form-actions">
            <button className="btn btn-primary" type="submit">{editingId == null ? 'Add to budget' : 'Save changes'}</button>
            {editingId != null && <button className="btn" type="button" onClick={resetDraft}>Cancel edit</button>}
          </div>
        </form>
      </section>

      <section className="card" aria-labelledby="budget-list-title">
        <div className="card-head"><h2 id="budget-list-title">This week's plan ({entries.length})</h2></div>
        {entries.length === 0 ? <p className="empty">No planned cash movements for this week. Add expected income and expenses above.</p> : (
          <ul className="tx-list budget-list">
            {entries.map((entry) => (
              <li className="budget-entry" key={entry.id}>
                <div className="budget-entry-main">
                  <span className="tx-title">{entry.desc}</span>
                  <span className="tx-meta">{formatDate(entry.date)} · Planned {entry.type}</span>
                </div>
                <strong className={`tx-amount ${entry.type === 'income' ? 'is-pos' : 'is-neg'}`}>{entry.type === 'income' ? '+' : '−'}{m(entry.amt)}</strong>
                <div className="actions budget-entry-actions">
                  <button type="button" className="btn" onClick={() => editEntry(entry)}>Edit</button>
                  <button type="button" className="btn btn-danger" onClick={() => deleteEntry(entry.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
