/*
 * =============================================================================
 * FILE OVERVIEW: Budget.jsx (components/Budget.jsx)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * The "Budget" tab: a WEEKLY CASH-FLOW PLANNER. The user picks any date, the
 * component finds that date's week (Monday to Sunday), and lets them:
 *   - set the week's starting cash,
 *   - add / edit / delete PLANNED income and expense items for that week,
 *   - see planned income, planned expenses, net flow and the projected ending
 *     cash, with a shortfall warning when the projection is negative.
 * These plans never touch the real register totals (see the on-screen hint).
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   App.jsx (Tracker) owns ALL the data in its `data` state, including `budget`
 *   ({ weeks: { 'YYYY-MM-DD of Monday': { startingCash, entries: [...] } } }).
 *   Tracker renders: <Budget budget={data.budget || { weeks: {} }} onChange={updateBudget} cur={cur} />
 *   Props RECEIVED here:
 *     budget   : the whole budget object (read-only here).
 *     onChange : updateBudget from Tracker; this component calls it with a NEW
 *                budget object, Tracker's setData stores it, localStorage saves it.
 *     cur      : the currency symbol, used by money().
 *   Props PASSED down: none (no child components; everything is plain JSX).
 *   Helpers imported from utils/finance.js: formatDate, money, todayISO.
 *   State flow: Budget's own useState = UI only (selected date, form draft,
 *   editing id, error). The BUDGET DATA stays in Tracker; Budget never changes it
 *   directly, it calls onChange(newBudget). This is "lifting state up".
 *
 * PRIMARY REACT MECHANICS USED
 * ----------------------------
 * STATE (useState):
 *   - selectedDate : 'YYYY-MM-DD' chosen in the date picker; starts as today.
 *   - draft        : the add/edit form's values { id, date, type, desc, amt }; lazy-initialised with blankEntry().
 *   - editingId    : null (adding a new item) or the id of the item being edited.
 *   - error        : validation message text ('' = none).
 * MEMOISATION (useMemo): `entries` = a SORTED COPY of the week's entries, recomputed only when week.entries changes.
 * DERIVED VALUES (not state): weekStart, week, entries, income, expenses, net, projectedCash. Recomputed every
 *   render from props + state, so they cannot go out of sync.
 * ARRAY ITERATION (know each one):
 *   - [...week.entries].sort(...)      : copy first, then sort the copy (sort mutates, so never sort state directly).
 *   - .filter(type === 'income')       : keep income items; then .reduce() adds their amounts.
 *   - .filter(type === 'expense')      : same for expenses.
 *   - .reduce((sum, entry) => ..., 0)  : collapse an array into one number.
 *   - week.entries.map(item => item.id === editingId ? entry : item): replace ONE item (edit) without mutating.
 *   - week.entries.filter(entry => entry.id !== id): remove ONE item (delete).
 *   - [...week.entries, entry]         : append one item (spread, no mutation).
 *   - entries.map((entry) => <li key={entry.id}>...): renders the list; key = unique id.
 * CONDITIONAL RENDERING: ternaries and && for the empty message, warning/hint, edit-mode buttons, error text.
 * CONTROLLED INPUTS: every input has value={...} and onChange that updates state.
 * IMMUTABLE UPDATES: setDraft((d) => ({ ...d, field: value })) and saveWeek builds new nested objects.
 * NOTE for the defense: this tab uses type 'income' (not 'sale') for planned items; the register uses 'sale'.
 *   They are separate data, which is why budget plans never affect the register totals.
 * =============================================================================
 */

// Import useMemo (cache a computed value) and useState (state) from React.
import { useMemo, useState } from 'react'
// Import formatDate (ISO text to readable date), money (format a number with the currency symbol) and todayISO (today's local date as YYYY-MM-DD).
import { formatDate, money, todayISO } from '../utils/finance.js'

// blankEntry makes an empty form draft; `date` defaults to today (default parameter); type starts as 'income', desc '', amt '' (text, because inputs hold text), id null (new item).
const blankEntry = (date = todayISO()) => ({ id: null, date, type: 'income', desc: '', amt: '' })
// pad turns a number into text with at least 2 characters (5 becomes "05").
const pad = (n) => String(n).padStart(2, '0')
// iso converts a Date object to a local 'YYYY-MM-DD' string (getMonth is 0-based, so +1).
const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// startOfWeek returns the Monday (as 'YYYY-MM-DD') of the week that contains `value`.
function startOfWeek(value) {
  // Make a Date at 12:00 noon (noon avoids daylight-saving edge cases at midnight).
  const d = new Date(`${value}T12:00:00`)
  // getDay() is 0 for Sunday ... 6 for Saturday.
  const day = d.getDay()
  // (day + 6) % 7 converts to "days since Monday" (Mon=0 ... Sun=6); subtract that many days from the date.
  d.setDate(d.getDate() - ((day + 6) % 7))
  // Return the Monday as an ISO string.
  return iso(d)
// Close startOfWeek.
}

// addDays returns `value` plus `amount` days (negative moves back) as 'YYYY-MM-DD'.
function addDays(value, amount) {
  // Noon date to avoid daylight-saving problems.
  const d = new Date(`${value}T12:00:00`)
  // setDate handles month/year rollovers automatically.
  d.setDate(d.getDate() + amount)
  // Return the new date as an ISO string.
  return iso(d)
// Close addDays.
}

// displayRange builds the readable text of a week, such as "19 Oct 2026 – 25 Oct 2026".
function displayRange(start) {
  // The Sunday is 6 days after the Monday.
  const end = addDays(start, 6)
  // Format both ends with formatDate and join them with an en dash.
  return `${formatDate(start)} – ${formatDate(end)}`
// Close displayRange.
}

// safeWeek reads one week from the weeks object defensively, so missing or corrupted data never crashes the page.
function safeWeek(weeks, start) {
  // ?. returns undefined if `weeks` is missing; [start] picks the week by its Monday key.
  const week = weeks?.[start]
  // Return a clean week object with guaranteed shapes.
  return {
    // Use the saved startingCash only if it converts to a finite number; otherwise 0.
    startingCash: Number.isFinite(Number(week?.startingCash)) ? Number(week.startingCash) : 0,
    // Use the saved entries only if they are really an array; otherwise an empty array.
    entries: Array.isArray(week?.entries) ? week.entries : [],
  // Close the returned object.
  }
// Close safeWeek.
}

// Export the component; props are destructured: budget (data from Tracker), onChange (callback to Tracker), cur (currency symbol).
export default function Budget({ budget, onChange, cur }) {
  // State: the date chosen in the picker; starts as today's local date.
  const [selectedDate, setSelectedDate] = useState(todayISO())
  // State: the form draft; the function form runs blankEntry() only on the first render (lazy initial state).
  const [draft, setDraft] = useState(() => blankEntry())
  // State: null means "adding"; an id means "editing that entry".
  const [editingId, setEditingId] = useState(null)
  // State: the validation error text shown under the form ('' = no error).
  const [error, setError] = useState('')
  // Derived: the Monday of the selected date's week; it is also the key in budget.weeks.
  const weekStart = startOfWeek(selectedDate)
  // Derived: this week's data from the budget prop, made safe by safeWeek.
  const week = safeWeek(budget?.weeks, weekStart)
  // Cache the sorted list; it is recalculated only when week.entries changes.
  const entries = useMemo(
    // Copy the array with spread, then sort the copy by date text, and for equal dates by id (as text); `||` uses the second comparison only when the first returns 0.
    () => [...week.entries].sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id))),
    // Dependency array: recompute only when the week's entries array changes.
    [week.entries],
  // Close the useMemo call.
  )
  // Total planned income: .filter() keeps income items, .reduce() sums their amounts (Number(entry.amt || 0) guards against empty values).
  const income = entries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amt || 0), 0)
  // Total planned expenses: the same pattern for expense items.
  const expenses = entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amt || 0), 0)
  // Net planned flow: income minus expenses (negative means more going out than coming in).
  const net = income - expenses
  // Projected ending cash: starting cash plus net flow.
  const projectedCash = Number(week.startingCash || 0) + net
  // Short helper: format a number as money with this tab's currency symbol.
  const m = (value) => money(value, cur)

  // saveWeek merges `patch` (for example { entries: next }) into this week and sends the whole new budget up to Tracker.
  function saveWeek(patch) {
    // Call the onChange prop (Tracker's updateBudget) with a NEW budget object (state is never mutated).
    onChange({
      // Keep every other field of the budget.
      ...budget,
      // Rebuild the weeks object.
      weeks: {
        // Keep all the other weeks (|| {} guards against a missing weeks object).
        ...(budget?.weeks || {}),
        // Replace only the selected week: the safe week plus the changed fields (computed key from weekStart).
        [weekStart]: { ...week, ...patch },
      // Close the weeks object.
      },
    // Close the budget object and the onChange call.
    })
  // Close saveWeek.
  }

  // resetDraft empties the form and leaves edit mode.
  function resetDraft() {
    // Replace the draft with a blank one dated at the start of the visible week.
    setDraft(blankEntry(weekStart))
    // Leave edit mode (null = adding).
    setEditingId(null)
    // Clear any error text.
    setError('')
  // Close resetDraft.
  }

  // submitEntry runs when the form is submitted (for both adding and editing); `event` is the submit event.
  function submitEntry(event) {
    // Stop the browser's default form submit (page reload).
    event.preventDefault()
    // Convert the typed amount text to a number.
    const amount = Number(draft.amt)
    // Validation 1: description must not be blank; setError returns undefined, and `return` exits the function.
    if (!draft.desc.trim()) return setError('Enter a description for this planned cash movement.')
    // Validation 2: amount must be a real number above zero.
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.')
    // Validation 3: the date must lie within the selected week (ISO date strings compare correctly as text).
    if (draft.date < weekStart || draft.date > addDays(weekStart, 6)) return setError('Choose a date within the selected week.')
    // Build the entry object that will be saved.
    const entry = {
      // Keep the id when editing (?? uses the right side only for null/undefined); for a new item create a unique id from the timestamp plus a random suffix.
      id: editingId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      // The chosen date.
      date: draft.date,
      // 'income' or 'expense'.
      type: draft.type,
      // The trimmed description.
      desc: draft.desc.trim(),
      // The amount rounded to 2 decimal places.
      amt: Math.round(amount * 100) / 100,
    // Close the entry object.
    }
    // Build the new entries array: adding appends, editing replaces.
    const next = editingId == null
      // ADD: spread the existing entries and append the new one (no mutation).
      ? [...week.entries, entry]
      // EDIT: .map() returns a new array where the item with the matching id is replaced by the updated entry.
      : week.entries.map((item) => item.id === editingId ? entry : item)
    // Save the new entries for this week (this calls onChange up to Tracker).
    saveWeek({ entries: next })
    // Clear the form and leave edit mode.
    resetDraft()
  // Close submitEntry.
  }

  // editEntry loads an existing entry into the form (edit mode).
  function editEntry(entry) {
    // Copy the entry into the draft; amt becomes text because the input holds text.
    setDraft({ ...entry, amt: String(entry.amt) })
    // Remember which entry is being edited.
    setEditingId(entry.id)
    // Clear any error.
    setError('')
  // Close editEntry.
  }

  // deleteEntry removes one entry by id, after confirmation.
  function deleteEntry(id) {
    // Ask the user; if they cancel (false), stop.
    if (!window.confirm('Delete this planned cash movement?')) return
    // .filter() builds a new array without the entry whose id matches, and saves it.
    saveWeek({ entries: week.entries.filter((entry) => entry.id !== id) })
    // If the deleted entry was being edited, reset the form.
    if (editingId === id) resetDraft()
  // Close deleteEntry.
  }

  // changeWeek moves forward (+1) or backward (-1) by whole weeks.
  function changeWeek(amount) {
    // Move the selected date by amount * 7 days from the current week's Monday.
    setSelectedDate(addDays(weekStart, amount * 7))
    // Reset the form because the draft date belongs to the old week.
    resetDraft()
  // Close changeWeek.
  }

  // Return the JSX.
  return (
    // Outer wrapper for the Budget tab (CSS class budget-page).
    <div className="budget-page">
      {/* Card 1: the week selector and starting cash; aria-labelledby names it by the heading id. */}
      <section className="card" aria-labelledby="budget-title">
        {/* Card header row. */}
        <div className="card-head">
          {/* Container for the title and the hint. */}
          <div>
            {/* Card title. */}
            <h2 id="budget-title">Weekly cash-flow budget</h2>
            {/* Hint saying that plans do not change the actual register totals. */}
            <p className="hint">Plan expected cash movements before they happen. These plans do not change your actual register totals.</p>
          {/* Close the title container. */}
          </div>
        {/* Close the card header. */}
        </div>
        {/* Row with the previous button, the date picker and the next button. */}
        <div className="budget-week-controls">
          {/* Previous week button; onClick calls changeWeek(-1). */}
          <button type="button" className="btn" onClick={() => changeWeek(-1)} aria-label="Previous week">← Previous</button>
          {/* Label wrapping the date input. */}
          <label className="budget-date-field">Choose a date in the week
            {/* Controlled date input: value from state; onChange stores the new date (falls back to today if cleared) and resets the form. */}
            <input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value || todayISO()); resetDraft() }} />
          {/* Close the label. */}
          </label>
          {/* Next week button; onClick calls changeWeek(1). */}
          <button type="button" className="btn" onClick={() => changeWeek(1)} aria-label="Next week">Next →</button>
        {/* Close the controls row. */}
        </div>
        {/* Shows the readable range of the selected week. */}
        <p className="budget-range">Week of {displayRange(weekStart)}</p>
        {/* Wrapper for the starting-cash field. */}
        <div className="field budget-starting-cash">
          {/* Label linked to the input by htmlFor/id. */}
          <label htmlFor="budget-start-cash">Starting cash for this week</label>
          {/* Box that holds the currency symbol and the input. */}
          <div className="amount-wrap">
            {/* Currency symbol from the `cur` prop (decorative, hidden from screen readers). */}
            <span className="amount-cur" aria-hidden="true">{cur}</span>
            {/* Number input for starting cash. */}
            <input
              /* id matches the label's htmlFor. */
              id="budget-start-cash"
              /* Numeric input. */
              type="number"
              /* No negative numbers. */
              min="0"
              /* Allow cents. */
              step="0.01"
              /* Show a decimal keyboard on phones. */
              inputMode="decimal"
              /* Controlled value: read from the saved week data (props), not from local state. */
              value={week.startingCash}
              /* Handler for every change. */
              onChange={(event) => {
                // Read the typed text.
                const value = event.target.value
                // Accept an empty box or a finite non-negative number; save it (empty becomes 0, otherwise rounded to 2 decimals) through saveWeek, which updates Tracker's state.
                if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)) saveWeek({ startingCash: value === '' ? 0 : Math.round(Number(value) * 100) / 100 })
              // Close the handler.
              }}
            /* Self-close the input. */
            />
          {/* Close the amount box. */}
          </div>
          {/* Hint under the field. */}
          <p className="hint">Enter the cash you expect to have at the beginning of this week.</p>
        {/* Close the starting-cash wrapper. */}
        </div>
      {/* Close card 1. */}
      </section>

      {/* Three summary tiles (a description list). */}
      <dl className="stats stats-3 budget-stats">
        {/* Tile 1: planned income, green. */}
        <div className="stat"><dt>Planned income</dt><dd className="is-pos">{m(income)}</dd></div>
        {/* Tile 2: planned expenses, red. */}
        <div className="stat"><dt>Planned expenses</dt><dd className="is-neg">{m(expenses)}</dd></div>
        {/* Tile 3: net flow; the class is red when negative, green otherwise. */}
        <div className="stat"><dt>Net planned flow</dt><dd className={net < 0 ? 'is-neg' : 'is-pos'}>{m(net)}</dd></div>
      {/* Close the tiles. */}
      </dl>

      {/* Card 2: projected ending cash. */}
      <section className="card" aria-labelledby="projection-title">
        {/* Card title. */}
        <h2 id="projection-title">Projected ending cash</h2>
        {/* Big number; the template literal adds ' is-neg' when negative, otherwise ' is-pos'. */}
        <p className={`budget-projection${projectedCash < 0 ? ' is-neg' : ' is-pos'}`}>{m(projectedCash)}</p>
        {/* Conditional rendering with a ternary: warning when the projection is negative, otherwise a formula hint. */}
        {projectedCash < 0
          // Warning branch; role="status" makes assistive technology announce it; Math.abs shows the shortfall as a positive amount.
          ? <p className="budget-warning" role="status">Shortfall warning: your planned expenses exceed your starting cash and planned income by {m(Math.abs(projectedCash))}.</p>
          // Normal branch: explains the formula.
          : <p className="hint">Starting cash + planned income − planned expenses.</p>}
      {/* Close card 2. */}
      </section>

      {/* Card 3: the add/edit form. */}
      <section className="card" aria-labelledby="planned-entry-title">
        {/* Title changes depending on whether we are adding or editing. */}
        <h2 id="planned-entry-title">{editingId == null ? 'Add a planned cash movement' : 'Edit planned cash movement'}</h2>
        {/* Form: onSubmit runs submitEntry. */}
        <form onSubmit={submitEntry}>
          {/* Two-button toggle (reuses the .seg styles); role="group" and aria-label describe it. */}
          <div className="seg budget-type-toggle" role="group" aria-label="Cash movement type">
            {/* Income button: aria-pressed is true when draft.type is 'income'; onClick uses the functional update to copy the draft and change only type. */}
            <button type="button" className="is-sale" aria-pressed={draft.type === 'income'} onClick={() => setDraft((d) => ({ ...d, type: 'income' }))}><span>Planned income</span><small>Cash expected in</small></button>
            {/* Expense button: the same idea with 'expense'. */}
            <button type="button" className="is-expense" aria-pressed={draft.type === 'expense'} onClick={() => setDraft((d) => ({ ...d, type: 'expense' }))}><span>Planned expense</span><small>Cash expected out</small></button>
          {/* Close the toggle. */}
          </div>
          {/* Description field wrapper. */}
          <div className="field">
            {/* Label linked to the input. */}
            <label htmlFor="budget-desc">Description</label>
            {/* Controlled text input: value from draft.desc; onChange updates only desc through the functional update; maxLength limits the text; required uses the browser's own check. */}
            <input id="budget-desc" value={draft.desc} maxLength={120} onChange={(event) => setDraft((d) => ({ ...d, desc: event.target.value }))} placeholder="e.g. Supplier payment, customer invoice" required />
          {/* Close the description wrapper. */}
          </div>
          {/* Two fields side by side. */}
          <div className="row2">
            {/* Amount field wrapper. */}
            <div className="field">
              {/* Label linked to the input. */}
              <label htmlFor="budget-amount">Amount</label>
              {/* Controlled number input for the amount (stored as text in draft.amt). */}
              <input id="budget-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.amt} onChange={(event) => setDraft((d) => ({ ...d, amt: event.target.value }))} placeholder="0.00" required />
            {/* Close the amount wrapper. */}
            </div>
            {/* Date field wrapper. */}
            <div className="field">
              {/* Label linked to the input. */}
              <label htmlFor="budget-entry-date">Planned date</label>
              {/* Controlled date input restricted to the selected week with min and max. */}
              <input id="budget-entry-date" type="date" min={weekStart} max={addDays(weekStart, 6)} value={draft.date} onChange={(event) => setDraft((d) => ({ ...d, date: event.target.value }))} required />
            {/* Close the date wrapper. */}
            </div>
          {/* Close the two-column row. */}
          </div>
          {/* Show the error paragraph only when error is a non-empty string; role="alert" announces it. */}
          {error && <p className="field-error" role="alert">{error}</p>}
          {/* Row of action buttons. */}
          <div className="actions budget-form-actions">
            {/* Submit button; its text depends on add/edit mode. */}
            <button className="btn btn-primary" type="submit">{editingId == null ? 'Add to budget' : 'Save changes'}</button>
            {/* Cancel button shown only in edit mode (editingId is not null); it calls resetDraft. */}
            {editingId != null && <button className="btn" type="button" onClick={resetDraft}>Cancel edit</button>}
          {/* Close the actions row. */}
          </div>
        {/* Close the form. */}
        </form>
      {/* Close card 3. */}
      </section>

      {/* Card 4: the list of planned entries for this week. */}
      <section className="card" aria-labelledby="budget-list-title">
        {/* Header showing how many entries exist. */}
        <div className="card-head"><h2 id="budget-list-title">This week's plan ({entries.length})</h2></div>
        {/* Ternary: empty message when there are no entries, otherwise the list. */}
        {entries.length === 0 ? <p className="empty">No planned cash movements for this week. Add expected income and expenses above.</p> : (
          // The list container.
          <ul className="tx-list budget-list">
            {/* .map() turns each entry in the sorted `entries` array into one list item. */}
            {entries.map((entry) => (
              // key={entry.id} gives React a unique identity for each row (needed for correct list updates).
              <li className="budget-entry" key={entry.id}>
                {/* Left part: description and meta line. */}
                <div className="budget-entry-main">
                  {/* The description. */}
                  <span className="tx-title">{entry.desc}</span>
                  {/* Date and type text. */}
                  <span className="tx-meta">{formatDate(entry.date)} · Planned {entry.type}</span>
                {/* Close the left part. */}
                </div>
                {/* Amount: class is green for income, red for expense; the sign is + or − (a real minus sign) followed by the formatted money. */}
                <strong className={`tx-amount ${entry.type === 'income' ? 'is-pos' : 'is-neg'}`}>{entry.type === 'income' ? '+' : '−'}{m(entry.amt)}</strong>
                {/* Edit and delete buttons. */}
                <div className="actions budget-entry-actions">
                  {/* Edit: passes this row's entry to editEntry. */}
                  <button type="button" className="btn" onClick={() => editEntry(entry)}>Edit</button>
                  {/* Delete: passes this row's id to deleteEntry. */}
                  <button type="button" className="btn btn-danger" onClick={() => deleteEntry(entry.id)}>Delete</button>
                {/* Close the buttons container. */}
                </div>
              {/* Close the list item. */}
              </li>
            // Close the .map() call.
            ))}
          {/* Close the list. */}
          </ul>
        // Close the ternary's parenthesis.
        )}
      {/* Close card 4. */}
      </section>
    {/* Close the outer wrapper. */}
    </div>
  // Close the return parenthesis.
  )
// Close the component.
}