// =============================================================================
// History.jsx: the "History" tab.
//
// What this file demonstrates (Mockup JSON & Dynamic Data Mapping sprint):
//   1. Dynamic rendering:   every row, month group and dropdown option is produced
//                           from an array with .map(); nothing is hard-coded in JSX.
//   2. Filtering:           .filter() chained on the transactions array, driven by
//                           React state (useState) for search, type and category.
//   3. Sorting:             a lookup table of compare functions used with .sort().
//   4. Static positioning:  the layout never shifts while you type or filter
//                           (see the .filter-* and .history-results rules in styles.css).
//
// The data itself comes from the parent (App.jsx) through the `tx` prop. This
// component only decides what to SHOW; it never changes the saved data.
// =============================================================================

import { useState } from 'react'
import TxRow from './TxRow.jsx'
import categories from '../data/categories.json'
import { formatMonth } from '../utils/finance.js'

// Download every entry as a CSV file. Each value is wrapped in quotes and any quote
// inside a value is doubled (""), which is the standard way to keep commas and
// quotes in descriptions from breaking the columns.
function exportCsv(tx) {
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"'
  const rows = tx.map((t) => [t.date, t.type, t.cat, t.desc, t.amt].map(q).join(','))
  const csv = 'date,type,category,description,amount\n' + rows.join('\n')
  // A Blob + temporary link lets the browser download a file with no server involved.
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'kitakita.csv' })
  a.click()
  URL.revokeObjectURL(url) // free the temporary URL once the download has started
}

// Group an ALREADY SORTED list by month, e.g. [{ key: '2026-10', items: [...] }, ...].
// It only compares each entry with the previous group, so it relies on the list being
// in date order. That works for both newest-first and oldest-first.
function groupByMonth(sorted) {
  const groups = []
  sorted.forEach((t) => {
    const key = t.date.slice(0, 7) // 'YYYY-MM' from 'YYYY-MM-DD'
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(t) // same month: add to the current group
    else groups.push({ key, items: [t] })            // new month: start a new group
  })
  return groups
}

// Options for the dropdowns, kept as [value, label] pairs so they can be rendered with .map().
const TYPE_OPTIONS = [['all', 'All types'], ['sale', 'Sales'], ['expense', 'Expenses']]

const SORT_OPTIONS = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['high', 'Highest amount'],
  ['low', 'Lowest amount'],
]

// One compare function per sort option. Looking the function up by name replaces a long
// if/else chain. Each one has a tie-breaker so entries with equal dates or amounts keep
// a stable, predictable order (otherwise rows could appear to jump around).
const SORTERS = {
  newest: (a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id),
  oldest: (a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id),
  high: (a, b) => b.amt - a.amt || b.date.localeCompare(a.date),
  low: (a, b) => a.amt - b.amt || b.date.localeCompare(a.date),
}

// Category choices follow the selected type, so you never pick an impossible combination
// (for example the "Rent" category while viewing Sales). For "all types" we merge both
// lists; the Set removes any duplicate names.
const categoryChoices = (type) =>
  type === 'all' ? [...new Set([...categories.sale, ...categories.expense])] : categories[type]

// Props (all passed down from App.jsx):
//   tx            the full list of transactions
//   cur           currency symbol used when formatting amounts
//   onDelete      delete one entry by id
//   onClear       wipe all entries
//   onLoadSample  add the mock entries from src/data/mockData.json
//   sampleLoaded  true once every mock entry is already present (disables the button)
//   canLoadSample true ONLY for the Dummy demo account; every other account never sees the button
export default function History({ tx, cur, onDelete, onClear, onLoadSample, sampleLoaded, canLoadSample }) {
  // The four controls are the ONLY state this component owns. Everything shown on screen
  // (the filtered list, the count, the month groups) is calculated from these four values
  // plus `tx`, so it can never get out of sync.
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('newest')

  // Normalise the search text once: trim spaces and ignore upper/lower case.
  const needle = query.trim().toLowerCase()

  // True when any control differs from its default. Used to enable "Clear filters".
  const filtersActive = needle !== '' || type !== 'all' || cat !== 'all' || sort !== 'newest'

  // Filtering pipeline. Each .filter() narrows the previous result:
  //   1) by type, 2) by category, 3) by search text (matches description, category or amount).
  // .filter() returns a NEW array, so the .sort() that follows reorders that copy and
  // never touches the original `tx` that is saved to localStorage.
  const visible = tx
    .filter((t) => type === 'all' || t.type === type)
    .filter((t) => cat === 'all' || t.cat === cat)
    .filter((t) => !needle || `${t.desc} ${t.cat} ${t.amt}`.toLowerCase().includes(needle))
    .sort(SORTERS[sort])

  // Month headings only make sense when the list is in date order.
  const byDate = sort === 'newest' || sort === 'oldest'

  // Changing the type resets the category, because the previously chosen category
  // might not exist under the new type (for example "Rent" after switching to Sales).
  const changeType = (value) => {
    setType(value)
    setCat('all')
  }

  // Put every control back to its default in one go.
  const resetFilters = () => {
    setQuery('')
    setType('all')
    setCat('all')
    setSort('newest')
  }

  // Turn an array of transactions into an array of <TxRow> components with .map().
  // `key` lets React track each row by its unique id instead of its position.
  const renderRows = (items) => items.map((t) => <TxRow key={t.id} t={t} cur={cur} onDelete={onDelete} />)

  // Decide what goes in the results area. There are four mutually exclusive cases.
  let results
  if (tx.length === 0) {
    // Case 1: nothing saved at all.
    results = <p className="empty">No entries yet. Add one in Register{canLoadSample ? ', or load the sample data' : ''}.</p>
  } else if (visible.length === 0) {
    // Case 2: there is data, but the current filters hide all of it.
    results = <p className="empty">No entries match your filters.</p>
  } else if (byDate) {
    // Case 3: date order, so show one section per month (a .map() inside a .map()).
    results = groupByMonth(visible).map((g) => (
      <section className="month-group" key={g.key} aria-label={formatMonth(g.key, true)}>
        <h3>{formatMonth(g.key, true)}</h3>
        <ul className="tx-list">{renderRows(g.items)}</ul>
      </section>
    ))
  } else {
    // Case 4: sorted by amount, so one flat list (month groups would be meaningless).
    results = <ul className="tx-list">{renderRows(visible)}</ul>
  }

  return (
    <section className="card" aria-labelledby="history-title">
      <div className="card-head">
        {/* The count shows ALL entries, not the filtered number (that is shown further down). */}
        <h2 id="history-title">All entries ({tx.length})</h2>
        <div className="actions">
          {/* Not rendered at all unless this is the Dummy account. Disabled once every
              sample entry exists, so it cannot add duplicates. */}
          {canLoadSample && (
            <button type="button" className="btn" onClick={onLoadSample} disabled={sampleLoaded}>
              {sampleLoaded ? 'Sample data loaded' : 'Load sample data'}
            </button>
          )}
          {/* Exports everything, not only what is currently filtered. */}
          <button type="button" className="btn" onClick={() => exportCsv(tx)}>Export CSV</button>
          {/* window.confirm guards the destructive action; `&&` only calls onClear if confirmed. */}
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => window.confirm('Delete all entries and reset opening cash to 0? This cannot be undone.') && onClear()}
          >
            Clear all data
          </button>
        </div>
      </div>

      {/* Controlled inputs: each `value` comes from state and each onChange updates that state,
          so React re-runs the filter pipeline above on every keystroke or selection. */}
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
        {/* role="status" makes screen readers announce the new count after each change. */}
        <p className="filter-status" role="status">
          Showing {visible.length} of {tx.length} {tx.length === 1 ? 'entry' : 'entries'}
        </p>
        {/* Always rendered (just disabled) so the row never changes size. */}
        <button type="button" className="btn" onClick={resetFilters} disabled={!filtersActive}>
          Clear filters
        </button>
      </div>

      {/* Fixed minimum height (see styles.css) keeps the card from collapsing and jumping. */}
      <div className="history-results">{results}</div>
    </section>
  )
}
