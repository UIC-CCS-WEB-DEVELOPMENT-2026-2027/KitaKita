import TxRow from './TxRow.jsx'

function exportCsv(tx) {
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"'
  const rows = tx.map((t) => [t.date, t.type, t.cat, t.desc, t.amt].map(q).join(','))
  const csv = 'date,type,category,description,amount\n' + rows.join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'kitakita.csv' })
  a.click()
  URL.revokeObjectURL(url)
}

export default function History({ tx, cur, onDelete, onReset }) {
  const sorted = [...tx].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>All entries ({sorted.length})</h2>
        <div className="actions">
          <button className="sm" onClick={() => exportCsv(tx)}>Export CSV</button>
          <button className="sm" onClick={() => window.confirm('Replace your entries with the sample data?') && onReset()}>Reset sample data</button>
        </div>
      </div>
      {sorted.length
        ? sorted.map((t) => <TxRow key={t.id} t={t} cur={cur} onDelete={onDelete} />)
        : <div className="empty">No entries yet.</div>}
    </div>
  )
}
