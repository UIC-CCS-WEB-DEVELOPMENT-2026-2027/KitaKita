import TxRow from './TxRow.jsx'
import { formatMonth } from '../utils/finance.js'

function exportCsv(tx) {
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"'
  const rows = tx.map((t) => [t.date, t.type, t.cat, t.desc, t.amt].map(q).join(','))
  const csv = 'date,type,category,description,amount\n' + rows.join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'kitakita.csv' })
  a.click()
  URL.revokeObjectURL(url)
}

// Newest first, grouped by month so a long list is easy to scan.
function groupByMonth(sorted) {
  const groups = []
  sorted.forEach((t) => {
    const key = t.date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(t)
    else groups.push({ key, items: [t] })
  })
  return groups
}

export default function History({ tx, cur, onDelete, onReset }) {
  const sorted = [...tx].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <section className="card" aria-labelledby="history-title">
      <div className="card-head">
        <h2 id="history-title">All entries ({sorted.length})</h2>
        <div className="actions">
          <button type="button" className="btn" onClick={() => exportCsv(tx)}>Export CSV</button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => window.confirm('Replace your entries with the sample data?') && onReset()}
          >
            Reset sample data
          </button>
        </div>
      </div>
      {sorted.length
        ? groupByMonth(sorted).map((g) => (
            <section className="month-group" key={g.key} aria-label={formatMonth(g.key, true)}>
              <h3>{formatMonth(g.key, true)}</h3>
              <ul className="tx-list">
                {g.items.map((t) => <TxRow key={t.id} t={t} cur={cur} onDelete={onDelete} />)}
              </ul>
            </section>
          ))
        : <p className="empty">No entries yet.</p>}
    </section>
  )
}
