/*
 * =============================================================================
 * FILE OVERVIEW: History.jsx
 * =============================================================================
 * WHAT IT DOES:
 *   Renders the "History" tab: a searchable, filterable, sortable list of all
 *   saved transactions, grouped by month when sorted by date. It also offers
 *   Export CSV, Load sample data (demo account only) and Clear all data.
 *
 * WHERE IT FITS:
 *   It is a child component of App.jsx. The parent owns the real data (the
 *   tx array saved to localStorage) and passes it down as props. This file only
 *   decides what to SHOW. It never mutates the saved data. Each row is rendered
 *   by a separate TxRow component (component modularity).
 *
 * PRIMARY REACT MECHANICS:
 *   - Props received from App.jsx:
 *       tx             full array of transaction objects
 *       cur            currency symbol (passed on to TxRow)
 *       onDelete       function to delete one entry by id (passed to TxRow)
 *       onClear        function to wipe all data
 *       onLoadSample   function to add mock entries
 *       sampleLoaded   boolean: all sample entries already present
 *       canLoadSample  boolean: true only for the Dummy demo account
 *   - useState (4 variables, the ONLY state owned here):
 *       query (search text), type (all, sale, expense),
 *       cat (category), sort (newest, oldest, high, low).
 *   - Derived data (NOT state): needle, filtersActive, visible, byDate, results
 *     are all recalculated from the four states plus tx on every render, so
 *     they can never go out of sync.
 *   - .filter() x3 chained, then .sort() on the filtered copy.
 *   - .map() used for dropdown options, month groups, and rows (including a
 *     map inside a map for the grouped view).
 *   - .forEach() inside groupByMonth, spread + Set for de-duplicating categories.
 *   - Controlled inputs: each value comes from state, each onChange updates state.
 *   - Lifting state up: data and actions live in the parent, the view logic
 *     lives here.
 * =============================================================================
 */

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

// Import the useState hook so this component can keep the search, type, category and sort values.
import { useState } from 'react'
// Import TxRow, the child component that renders a single transaction row.
import TxRow from './TxRow.jsx'
// Import the JSON file holding the category lists (a sale array and an expense array).
import categories from '../data/categories.json'
// Import formatMonth to turn a key like 2026-10 into a readable month name.
import { formatMonth } from '../utils/finance.js'

// Download every entry as a CSV file. Each value is wrapped in quotes and any quote
// inside a value is doubled (""), which is the standard way to keep commas and
// quotes in descriptions from breaking the columns.
// Declare exportCsv; it takes the full transaction array tx.
function exportCsv(tx) {
  // Helper q: converts a value to a string, doubles any quote characters, and wraps the result in quotes.
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"'
  // .map() converts each transaction object into one CSV line: pick the five fields in order, quote each, and join them with commas.
  const rows = tx.map((t) => [t.date, t.type, t.cat, t.desc, t.amt].map(q).join(','))
  // Build the full CSV text: a header line, a newline, then all rows joined by newlines.
  const csv = 'date,type,category,description,amount\n' + rows.join('\n')
  // A Blob + temporary link lets the browser download a file with no server involved.
  // Wrap the CSV text in a Blob and create a temporary object URL pointing to it.
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  // Create an invisible link element, assigning its href (the blob URL) and download (the file name) in one step.
  const a = Object.assign(document.createElement('a'), { href: url, download: 'kitakita.csv' })
  // Programmatically click the link, which starts the file download.
  a.click()
  // Release the temporary URL to free memory now that the download has started.
  URL.revokeObjectURL(url) // free the temporary URL once the download has started
// Close exportCsv.
}

// Group an ALREADY SORTED list by month, e.g. [{ key: '2026-10', items: [...] }, ...].
// It only compares each entry with the previous group, so it relies on the list being
// in date order. That works for both newest-first and oldest-first.
// Declare groupByMonth; sorted is the date-ordered array of transactions.
function groupByMonth(sorted) {
  // Start with an empty array that will collect the month groups.
  const groups = []
  // Loop through every transaction in order; .forEach runs the callback once per item (it does not return a new array).
  sorted.forEach((t) => {
    // Take the first 7 characters of the date string (YYYY-MM) to get the month key.
    const key = t.date.slice(0, 7) // 'YYYY-MM' from 'YYYY-MM-DD'
    // Look at the most recent group created so far (undefined if there are none yet).
    const last = groups[groups.length - 1]
    // If a last group exists and has the same month key, add this transaction to that group.
    if (last && last.key === key) last.items.push(t) // same month: add to the current group
    // Otherwise start a new group object for this month containing just this transaction.
    else groups.push({ key, items: [t] })            // new month: start a new group
  // Close the forEach callback.
  })
  // Return the finished array of month groups.
  return groups
// Close groupByMonth.
}

// Options for the dropdowns, kept as [value, label] pairs so they can be rendered with .map().
// Array of [value, label] pairs for the Type dropdown; the value is stored in state and the label is shown to the user.
const TYPE_OPTIONS = [['all', 'All types'], ['sale', 'Sales'], ['expense', 'Expenses']]

// Array of [value, label] pairs for the Sort dropdown.
const SORT_OPTIONS = [
  // Value "newest" shown as "Newest first".
  ['newest', 'Newest first'],
  // Value "oldest" shown as "Oldest first".
  ['oldest', 'Oldest first'],
  // Value "high" shown as "Highest amount".
  ['high', 'Highest amount'],
  // Value "low" shown as "Lowest amount".
  ['low', 'Lowest amount'],
// Close the SORT_OPTIONS array.
]

// One compare function per sort option. Looking the function up by name replaces a long
// if/else chain. Each one has a tie-breaker so entries with equal dates or amounts keep
// a stable, predictable order (otherwise rows could appear to jump around).
// Object whose keys match the sort option values and whose values are compare functions for .sort().
const SORTERS = {
  // Newest first: compare dates descending (b before a); if dates tie, the larger id (newer entry) goes first.
  newest: (a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id),
  // Oldest first: compare dates ascending; if tied, the smaller id goes first.
  oldest: (a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id),
  // Highest amount first: larger amounts earlier; if tied, newer date first.
  high: (a, b) => b.amt - a.amt || b.date.localeCompare(a.date),
  // Lowest amount first: smaller amounts earlier; if tied, newer date first.
  low: (a, b) => a.amt - b.amt || b.date.localeCompare(a.date),
// Close the SORTERS object.
}

// Category choices follow the selected type, so you never pick an impossible combination
// (for example the "Rent" category while viewing Sales). For "all types" we merge both
// lists; the Set removes any duplicate names.
// Arrow function that takes the selected type and returns the list of category names to show in the dropdown.
const categoryChoices = (type) =>
  // If type is "all", spread both lists into one array and wrap it in a Set to remove duplicates, then spread back into an array; otherwise return only the list for that type.
  type === 'all' ? [...new Set([...categories.sale, ...categories.expense])] : categories[type]

// Props (all passed down from App.jsx):
//   tx            the full list of transactions
//   cur           currency symbol used when formatting amounts
//   onDelete      delete one entry by id
//   onClear       wipe all entries
//   onLoadSample  add the mock entries from src/data/mockData.json
//   sampleLoaded  true once every mock entry is already present (disables the button)
//   canLoadSample true ONLY for the Dummy demo account; every other account never sees the button
// Declare and default-export History; the destructured props are the data (tx, cur) and the action callbacks and flags sent by the parent.
export default function History({ tx, cur, onDelete, onClear, onLoadSample, sampleLoaded, canLoadSample }) {
  // The four controls are the ONLY state this component owns. Everything shown on screen
  // (the filtered list, the count, the month groups) is calculated from these four values
  // plus `tx`, so it can never get out of sync.
  // State 1: query holds the search text; it starts empty and setQuery updates it on each keystroke.
  const [query, setQuery] = useState('')
  // State 2: type holds the selected type filter; it starts as "all".
  const [type, setType] = useState('all')
  // State 3: cat holds the selected category filter; it starts as "all".
  const [cat, setCat] = useState('all')
  // State 4: sort holds the selected sort option; it starts as "newest".
  const [sort, setSort] = useState('newest')

  // Normalise the search text once: trim spaces and ignore upper/lower case.
  // Derived value (not state): the cleaned, lowercase search text used for matching.
  const needle = query.trim().toLowerCase()

  // True when any control differs from its default. Used to enable "Clear filters".
  // Derived boolean: true if the search has text, or type or category is not "all", or sort is not "newest".
  const filtersActive = needle !== '' || type !== 'all' || cat !== 'all' || sort !== 'newest'

  // Filtering pipeline. Each .filter() narrows the previous result:
  //   1) by type, 2) by category, 3) by search text (matches description, category or amount).
  // .filter() returns a NEW array, so the .sort() that follows reorders that copy and
  // never touches the original `tx` that is saved to localStorage.
  // Build the list to display; start from the full tx array and chain operations (each returns a new array).
  const visible = tx
    // Filter 1: keep an entry if type is "all" or the entry's type matches the selected type.
    .filter((t) => type === 'all' || t.type === type)
    // Filter 2: keep an entry if category is "all" or the entry's category matches the selected category.
    .filter((t) => cat === 'all' || t.cat === cat)
    // Filter 3: keep everything if the search is empty; otherwise keep entries whose description, category and amount (joined into one lowercase string) contain the search text.
    .filter((t) => !needle || `${t.desc} ${t.cat} ${t.amt}`.toLowerCase().includes(needle))
    // Sort the filtered copy using the compare function chosen by looking up the current sort state in SORTERS.
    .sort(SORTERS[sort])

  // Month headings only make sense when the list is in date order.
  // Derived boolean: true when sorting by date (newest or oldest), which means month grouping is allowed.
  const byDate = sort === 'newest' || sort === 'oldest'

  // Changing the type resets the category, because the previously chosen category
  // might not exist under the new type (for example "Rent" after switching to Sales).
  // Handler called when the Type dropdown changes; value is the newly selected type.
  const changeType = (value) => {
    // Update the type state to the new value.
    setType(value)
    // Reset the category state to "all" so an impossible type and category combination cannot exist.
    setCat('all')
  // Close changeType.
  }

  // Put every control back to its default in one go.
  // Handler for the "Clear filters" button.
  const resetFilters = () => {
    // Clear the search text.
    setQuery('')
    // Reset the type to "all".
    setType('all')
    // Reset the category to "all".
    setCat('all')
    // Reset the sort to "newest".
    setSort('newest')
  // Close resetFilters.
  }

  // Turn an array of transactions into an array of <TxRow> components with .map().
  // `key` lets React track each row by its unique id instead of its position.
  // Helper that maps each transaction t to a TxRow; props passed down are t (the entry data), cur (for money formatting) and onDelete (so the row can delete itself via the parent).
  const renderRows = (items) => items.map((t) => <TxRow key={t.id} t={t} cur={cur} onDelete={onDelete} />)

  // Decide what goes in the results area. There are four mutually exclusive cases.
  // Declare a variable that will hold whichever JSX the cases below choose.
  let results
  // Check the first case: no transactions exist at all.
  if (tx.length === 0) {
    // Case 1: nothing saved at all.
    // Show the empty message; the sample-data hint appears only when canLoadSample is true.
    results = <p className="empty">No entries yet. Add one in Register{canLoadSample ? ', or load the sample data' : ''}.</p>
  // Check the second case: data exists, but the filters removed everything.
  } else if (visible.length === 0) {
    // Case 2: there is data, but the current filters hide all of it.
    // Show a "no matches" message.
    results = <p className="empty">No entries match your filters.</p>
  // Check the third case: the list is date-sorted so we can group by month.
  } else if (byDate) {
    // Case 3: date order, so show one section per month (a .map() inside a .map()).
    // Group the visible entries by month, then .map() each group into a section.
    results = groupByMonth(visible).map((g) => (
      // One section per month; key is the month key; aria-label gives a readable month name for screen readers.
      <section className="month-group" key={g.key} aria-label={formatMonth(g.key, true)}>
        {/* Visible month heading. */}
        <h3>{formatMonth(g.key, true)}</h3>
        {/* List of rows for this month; renderRows does the inner .map() over g.items. */}
        <ul className="tx-list">{renderRows(g.items)}</ul>
      {/* Close the month section. */}
      </section>
    // Close the group .map() callback.
    ))
  // Fall through to the fourth case: any other situation (sorted by amount).
  } else {
    // Case 4: sorted by amount, so one flat list (month groups would be meaningless).
    // Render all visible rows in a single flat list.
    results = <ul className="tx-list">{renderRows(visible)}</ul>
  // Close the if / else chain.
  }

  // Return the JSX for the History tab.
  return (
    // Card wrapper; aria-labelledby links the section to its heading.
    <section className="card" aria-labelledby="history-title">
      {/* Header row of the card containing the title and the action buttons. */}
      <div className="card-head">
        {/* The count shows ALL entries, not the filtered number (that is shown further down). */}
        {/* Heading showing the total number of entries (tx.length, not the filtered count). */}
        <h2 id="history-title">All entries ({tx.length})</h2>
        {/* Group of action buttons. */}
        <div className="actions">
          {/* Not rendered at all unless this is the Dummy account. Disabled once every
              sample entry exists, so it cannot add duplicates. */}
          {/* Conditional rendering: show the button only if canLoadSample is true. */}
          {canLoadSample && (
            // Button calls the parent's onLoadSample on click; disabled when sampleLoaded is true so duplicates cannot be added.
            <button type="button" className="btn" onClick={onLoadSample} disabled={sampleLoaded}>
              {/* Button text changes depending on the sampleLoaded prop. */}
              {sampleLoaded ? 'Sample data loaded' : 'Load sample data'}
            {/* Close the sample button. */}
            </button>
          // Close the conditional expression.
          )}
          {/* Exports everything, not only what is currently filtered. */}
          {/* Export button; the arrow function calls exportCsv with the FULL tx array. */}
          <button type="button" className="btn" onClick={() => exportCsv(tx)}>Export CSV</button>
          {/* window.confirm guards the destructive action; `&&` only calls onClear if confirmed. */}
          {/* Danger button for deleting everything. */}
          <button
            // Prevent accidental form submission behaviour.
            type="button"
            // Two CSS classes give it button and danger (red) styling.
            className="btn btn-danger"
            // On click, ask for confirmation; window.confirm returns true only if the user agrees, and && then calls the parent's onClear.
            onClick={() => window.confirm('Delete all entries and reset opening cash to 0? This cannot be undone.') && onClear()}
          // End of the opening tag.
          >
            {/* Button label. */}
            Clear all data
          {/* Close the danger button. */}
          </button>
        {/* Close the actions group. */}
        </div>
      {/* Close the card head. */}
      </div>

      {/* Controlled inputs: each `value` comes from state and each onChange updates that state,
          so React re-runs the filter pipeline above on every keystroke or selection. */}
      {/* Filter bar; role="search" marks it as a search landmark for assistive tech. */}
      <div className="filter-bar" role="search" aria-label="Filter entries">
        {/* Wrapper for the search box. */}
        <div className="filter-search">
          {/* Label tied to the input by htmlFor and id. */}
          <label htmlFor="hist-search">Search entries</label>
          {/* Search input, controlled by the query state. */}
          <input
            // Matches the label's htmlFor.
            id="hist-search"
            // Search type gives a clear button in some browsers.
            type="search"
            // Turns off browser autocomplete suggestions.
            autoComplete="off"
            // Hint text showing what can be searched.
            placeholder="Description, category or amount"
            // Controlled input: the displayed text always equals the query state.
            value={query}
            // On every keystroke, save the new text into state, which triggers a re-render and re-filters the list.
            onChange={(e) => setQuery(e.target.value)}
          // Self-close the input.
          />
        {/* Close the search wrapper. */}
        </div>
        {/* Wrapper for the Type dropdown. */}
        <div>
          {/* Label for the Type select. */}
          <label htmlFor="hist-type">Type</label>
          {/* Controlled select: value comes from the type state; onChange calls changeType, which also resets the category. */}
          <select id="hist-type" value={type} onChange={(e) => changeType(e.target.value)}>
            {/* .map() over TYPE_OPTIONS pairs to create one <option> each; key is the unique value. */}
            {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          {/* Close the Type select. */}
          </select>
        {/* Close the Type wrapper. */}
        </div>
        {/* Wrapper for the Category dropdown. */}
        <div>
          {/* Label for the Category select. */}
          <label htmlFor="hist-cat">Category</label>
          {/* Controlled select bound to the cat state; onChange saves the chosen category straight into state. */}
          <select id="hist-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            {/* A fixed first option that means no category filter. */}
            <option value="all">All categories</option>
            {/* .map() over the category names that fit the current type (from categoryChoices); each name is both the key, value and label. */}
            {categoryChoices(type).map((c) => <option key={c} value={c}>{c}</option>)}
          {/* Close the Category select. */}
          </select>
        {/* Close the Category wrapper. */}
        </div>
        {/* Wrapper for the Sort dropdown. */}
        <div>
          {/* Label for the Sort select. */}
          <label htmlFor="hist-sort">Sort by</label>
          {/* Controlled select bound to the sort state; changing it re-sorts the list. */}
          <select id="hist-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {/* .map() over SORT_OPTIONS pairs to produce the sort choices. */}
            {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          {/* Close the Sort select. */}
          </select>
        {/* Close the Sort wrapper. */}
        </div>
      {/* Close the filter bar. */}
      </div>

      {/* Row that holds the result count and the Clear filters button. */}
      <div className="filter-status-row">
        {/* role="status" makes screen readers announce the new count after each change. */}
        {/* Live status paragraph announcing the filtered count. */}
        <p className="filter-status" role="status">
          {/* Shows visible.length (filtered) of tx.length (total), with a ternary picking singular "entry" or plural "entries". */}
          Showing {visible.length} of {tx.length} {tx.length === 1 ? 'entry' : 'entries'}
        {/* Close the status paragraph. */}
        </p>
        {/* Always rendered (just disabled) so the row never changes size. */}
        {/* Clear filters button: onClick runs resetFilters, and disabled is true when no filter is active (filtersActive is false). */}
        <button type="button" className="btn" onClick={resetFilters} disabled={!filtersActive}>
          {/* Button label. */}
          Clear filters
        {/* Close the Clear filters button. */}
        </button>
      {/* Close the status row. */}
      </div>

      {/* Fixed minimum height (see styles.css) keeps the card from collapsing and jumping. */}
      {/* Output the JSX chosen in the if / else chain above (message, grouped lists or flat list). */}
      <div className="history-results">{results}</div>
    {/* Close the card section. */}
    </section>
  // Close the parentheses that wrap the returned JSX.
  )
// Close the History function body.
}
