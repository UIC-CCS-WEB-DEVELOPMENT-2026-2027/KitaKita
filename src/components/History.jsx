import { useState } from 'react'
import TxRow from './TxRow.jsx'
import categories from '../data/categories.json'
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

// Group an already-sorted list by month. Works for newest-first and oldest-first.
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

const TYPE_OPTIONS = [['all', 'All types'], ['sale', 'Sales'], ['expense', 'Expenses']]

const SORT_OPTIONS = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['high', 'Highest amount'],
  ['low', 'Lowest amount'],
]

const SORTERS = {
  newest: (a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id),
  oldest: (a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id),
  high: (a, b) => b.amt - a.amt || b.date.localeCompare(a.date),
  low: (a, b) => a.amt - b.amt || b.date.localeCompare(a.date),
}

// Category choices follow the selected type, so you never pick an impossible combination.
const categoryChoices = (type) =>
  type === 'all' ? [...new Set([...categories.sale, ...categories.expense])] : categories[type]

export default function History({ tx, cur, onDelete, onClear, onLoadSample, sampleLoaded }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('newest')

  const needle = query.trim().toLowerCase()
  const filtersActive = needle !== '' || type !== 'all' || cat !== 'all' || sort !== 'newest'

  // Filter with .filter(), then sort a copy so the saved data is never reordered.
  const visible = tx
    .filter((t) => type === 'all' || t.type === type)
    .filter((t) => cat === 'all' || t.cat === cat)
    .filter((t) => !needle || `${t.desc} ${t.cat} ${t.amt}`.toLowerCase().includes(needle))
    .sort(SORTERS[sort])

  // Month headings only make sense when the list is in date order.
  const byDate = sort === 'newest' || sort === 'oldest'

  const changeType = (value) => {
    setType(value)
    setCat('all') // the old category may not exist under the new type
  }

  const resetFilters = () => {
    setQuery('')
    setType('all')
    setCat('all')
    setSort('newest')
  }

  const renderRows = (items) => items.map((t) => <TxRow key={t.id} t={t} cur={cur} onDelete={onDelete} />)

  let results
  if (tx.length === 0) {
    results = <p className="empty">No entries yet. Add one in Register, or load the sample data.</p>
  } else if (visible.length === 0) {
    results = <p className="empty">No entries match your filters.</p>
  } else if (byDate) {
    results = groupByMonth(visible).map((g) => (
      <section className="month-group" key={g.key} aria-label={formatMonth(g.key, true)}>
        <h3>{formatMonth(g.key, true)}</h3>
        <ul className="tx-list">{renderRows(g.items)}</ul>
      </section>
    ))
  } else {
    results = <ul className="tx-list">{renderRows(visible)}</ul>
  }

  return (
    <section className="card" aria-labelledby="history-title">
      <div className="card-head">
        <h2 id="history-title">All entries ({tx.length})</h2>
        <div className="actions">
          <button type="button" className="btn" onClick={onLoadSample} disabled={sampleLoaded}>
            {sampleLoaded ? 'Sample data loaded' : 'Load sample data'}
          </button>
          <button type="button" className="btn" onClick={() => exportCsv(tx)}>Export CSV</button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => window.confirm('Delete all entries and reset opening cash to 0? This cannot be undone.') && onClear()}
          >
            Clear all data
          </button>
        </div>
      </div>

      <div className="filter-bar" role="search" aria-label="Filter entries">
        <div className="filter-search">
          <label htmlFor="hist-search">Search entries</label>
          <input
            id="hist-search"
            type="search"
            autoComplete="off"
            placeholder="Description, category or amount"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="hist-type">Type</label>
          <select id="hist-type" value={type} onChange={(e) => changeType(e.target.value)}>
            {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="hist-cat">Category</label>
          <select id="hist-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All categories</option>
            {categoryChoices(type).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="hist-sort">Sort by</label>
          <select id="hist-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-status-row">
        <p className="filter-status" role="status">
          Showing {visible.length} of {tx.length} {tx.length === 1 ? 'entry' : 'entries'}
        </p>
        {/* Always rendered (just disabled) so the row never changes size. */}
        <button type="button" className="btn" onClick={resetFilters} disabled={!filtersActive}>
          Clear filters
        </button>
      </div>

      <div className="history-results">{results}</div>
    </section>
  )
}
