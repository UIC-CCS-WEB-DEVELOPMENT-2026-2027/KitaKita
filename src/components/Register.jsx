/**
 * FILE OVERVIEW: Register.jsx
 *
 * WHAT IT DOES:
 *   The "Register" tab of the cash register app. It shows two summary stats
 *   (cash on hand, this month's net), a form to record a sale or an expense, and
 *   a list of the 5 most recent entries.
 *
 * WHERE IT FITS:
 *   Rendered by Tracker.jsx when tab === 'reg'. Tracker owns the data (tx array in
 *   its useState) and passes it down; Register owns only the FORM state. It renders
 *   TxRow.jsx once per recent entry. It never changes the tx array itself: it asks
 *   the parent to do it by calling onAdd(entry) or onDelete(id) (state flows down
 *   as props, events flow up as callbacks).
 *
 * REACT MECHANICS USED:
 *   - Props RECEIVED: tx (array of entries), stats (computed totals object),
 *     cur (currency symbol), onAdd (callback -> Tracker.addTx),
 *     onDelete (callback -> Tracker.deleteTx, forwarded to TxRow)
 *   - useState x7: kind, amount, desc, cat, date, error, notice
 *   - useRef: amountRef, a direct handle on the amount <input> so we can call .focus()
 *   - Controlled inputs: value={state} + onChange={setter}
 *   - .map() x2: categories[kind].map(...) builds the <option> list, and
 *     recent.map(...) builds the <TxRow> list (both use a key)
 *   - .slice(-5).reverse(): takes the last 5 entries, newest first. slice copies,
 *     so reverse() does NOT mutate the tx prop
 *   - Conditional rendering: && and ternary (recent.length ? list : empty message)
 *   - Fragment <>...</> to return two sibling elements without an extra div
 *   - No .filter() in this file (delete filtering happens in Tracker.jsx)
 *   - NOTE: Tracker's addTx returns undefined, so the `onAdd(entry) === false`
 *     check below never triggers in the current app; it only works if addTx returns false
 */

// Import useRef (a persistent box that does not cause re-render) and useState (local state) from React
import { useRef, useState } from 'react'
// Import the JSON file that lists category names for 'sale' and 'expense'
import categories from '../data/categories.json'
// Import the TxRow component used to render one entry in the list
import TxRow from './TxRow.jsx'
// Start a multi-line import of helper values from the finance utilities
import {
  // money formats a number with the currency symbol
  money,
  // todayISO returns today's date as a YYYY-MM-DD string
  todayISO,
  // cumulativeTotalCents sums existing entries of one type, in cents
  cumulativeTotalCents,
  // MAX_CUMULATIVE_TOTAL is the cap on total sales (or total expenses) in currency units
  MAX_CUMULATIVE_TOTAL,
  // MAX_CUMULATIVE_TOTAL_CENTS is the same cap expressed in cents (integers avoid decimal errors)
  MAX_CUMULATIVE_TOTAL_CENTS,
// Close the import list and name the source file
} from '../utils/finance.js'

// Export Register as the default export; the five names in braces are the props it receives from Tracker
export default function Register({ tx, stats, cur, onAdd, onDelete }) {
  // STATE: kind is 'sale' or 'expense' and starts as 'sale'; it controls the toggle buttons, the categories list and the placeholder
  const [kind, setKind] = useState('sale')
  // STATE: amount is the raw text typed in the amount input (kept as a string while typing)
  const [amount, setAmount] = useState('')
  // STATE: desc is the optional description text
  const [desc, setDesc] = useState('')
  // STATE: cat is the selected category; it starts as the first sale category
  const [cat, setCat] = useState(categories.sale[0])
  // STATE: date is the selected date string; it starts as today (todayISO() runs on every render but only the first result is used)
  const [date, setDate] = useState(todayISO())
  // STATE: error is the validation message for the amount ('' means no error)
  const [error, setError] = useState('')
  // STATE: notice is the success message shown after recording ('' means none)
  const [notice, setNotice] = useState('')
  // REF: amountRef starts as null and React fills amountRef.current with the amount <input> DOM element once it is attached via ref={amountRef}
  const amountRef = useRef(null)

  // Handler for the Sale/Expense toggle; k is the chosen kind ('sale' or 'expense')
  const pickKind = (k) => {
    // Store the new kind in state, which re-renders the form with the right labels and categories
    setKind(k)
    // Reset the category to the first one of the new kind, because the old category may not exist in the new list
    setCat(categories[k][0])
    // Clear any old error since the context changed
    setError('')
    // Clear any old success notice
    setNotice('')
  // Close pickKind
  }

  // Handler called whenever the amount input changes; value is the new text
  const changeAmount = (value) => {
    // Save the typed text so the controlled input shows it
    setAmount(value)
    // Typing again dismisses the error message
    setError('')
    // Typing again dismisses the success notice
    setNotice('')
  // Close changeAmount
  }

  // Form submit handler; e is the submit event
  const submit = (e) => {
    // Stop the browser from reloading the page on submit
    e.preventDefault()

    // Convert the amount text to a floating-point number (NaN if the text is empty or invalid)
    const amt = parseFloat(amount)

    // Reject if amt is not greater than 0 (NaN, 0 and negatives all fail `amt > 0`) or if it is not a finite number (catches Infinity)
    if (!(amt > 0) || !Number.isFinite(amt)) {
      // Show the validation message under the amount field
      setError('Enter an amount greater than zero.')
      // Make sure no success notice is displayed alongside the error
      setNotice('')
      // Put the cursor back in the amount input; ?. avoids a crash if the ref is still null
      amountRef.current?.focus()
      // Stop the submit; nothing is recorded
      return
    // Close the invalid-amount block
    }

    // Convert to whole cents (e.g. 12.34 -> 1234); Math.round fixes floating-point errors such as 0.1 * 3
    const amountCents = Math.round(amt * 100)

    // Reject if the cents value is not a safe integer (too huge to store exactly) or is zero/negative after rounding (e.g. 0.001 rounds to 0)
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      // Show a generic invalid-amount message
      setError('Enter a valid amount.')
      // Clear any success notice
      setNotice('')
      // Return focus to the amount input
      amountRef.current?.focus()
      // Stop the submit
      return
    // Close the unsafe-integer block
    }

    // Total cents already recorded for this kind (sale or expense), computed from the tx prop
    const currentCents = cumulativeTotalCents(tx, kind)

    // If the existing total plus this new amount would pass the allowed maximum, block it
    if (currentCents + amountCents > MAX_CUMULATIVE_TOTAL_CENTS) {
      // Work out how many cents are still available under the cap
      const remainingCents = Math.max(
        // Lower bound of zero so the remaining amount is never shown as negative
        0,
        // Cap minus what is already used
        MAX_CUMULATIVE_TOTAL_CENTS - currentCents
      // Close Math.max
      )

      // Show a detailed error built from several string pieces joined with +
      setError(
        // Start of the template literal; the text up to ${ is fixed, then an expression is inserted
        `This transaction would exceed the cumulative ${
          // Expression inside ${ }: the word 'sales' for sale entries or 'expenses' for expense entries
          kind === 'sale' ? 'sales' : 'expenses'
        // End of the first ${ } and the rest of the text; the cap formatted as currency is inserted, then + joins the next string
        } limit of ${money(MAX_CUMULATIVE_TOTAL, cur)}. ` +
        // Second string: shows the current total converted from cents to currency units
        `Current total: ${money(currentCents / 100, cur)}. ` +
        // Third string: shows the remaining allowance converted from cents to currency units
        `Remaining limit: ${money(remainingCents / 100, cur)}.`
      // Close setError
      )
      // Clear any success notice
      setNotice('')
      // Return focus to the amount input
      amountRef.current?.focus()
      // Stop the submit
      return
    // Close the limit-exceeded block
    }

    // Build the new entry object that will be handed to the parent
    const entry = {
      // type is 'sale' or 'expense' from the kind state
      type: kind,
      // amt is stored back in currency units (cents / 100)
      amt: amountCents / 100,
      // desc is the description with outer spaces removed
      desc: desc.trim(),
      // cat is the selected category
      cat,
      // date uses the chosen date, or today if the date input was cleared (empty string is falsy)
      date: date || todayISO(),
    // Close the entry object
    }

    // CALLBACK UP: call the parent's addTx with the entry; the parent updates its tx state. If the callback explicitly returns false, treat it as rejected
    if (onAdd(entry) === false) {
      // Tell the user the parent refused to save the entry
      setError('This transaction exceeds the cumulative limit and was not saved.')
      // Clear any success notice
      setNotice('')
      // Return focus to the amount input
      amountRef.current?.focus()
      // Stop here
      return
    // Close the rejected block
    }

    // Success: empty the amount input (controlled, so the screen clears too)
    setAmount('')
    // Empty the description input
    setDesc('')
    // Clear any error
    setError('')
    // Show a success message such as "Sale of ₱12.00 recorded." (announced by the role="status" paragraph)
    setNotice(`${kind === 'sale' ? 'Sale' : 'Expense'} of ${money(entry.amt, cur)} recorded.`)
  // Close the submit function
  }

  // DERIVED VALUE (not state): this month's net = revenue (r) minus expenses (e), recalculated every render from the stats prop
  const net = stats.thisMonth.r - stats.thisMonth.e
  // DERIVED ARRAY: slice(-5) copies the last 5 entries (oldest to newest), then reverse() flips the copy so the newest is first; the original tx prop is not mutated
  const recent = tx.slice(-5).reverse()

  // Return the JSX for this component
  return (
    // Fragment: lets us return two sibling blocks without adding an extra wrapper div
    <>
      {/* Description list holding the summary stats (semantic dl/dt/dd) */}
      <dl className="stats">
        {/* One stat box */}
        <div className="stat">
          {/* Term: the stat's name */}
          <dt>Cash on hand</dt>
          {/* Definition: the value, formatted with money(); the 'is-neg' class is added when cash is below zero */}
          <dd className={stats.cash < 0 ? 'is-neg' : ''}>{money(stats.cash, cur)}</dd>
        {/* Close the stat box */}
        </div>
        {/* Second stat box */}
        <div className="stat">
          {/* Term: the stat's name */}
          <dt>This month net</dt>
          {/* Value of the net; the class is 'is-neg' if negative, otherwise 'is-pos' */}
          <dd className={net < 0 ? 'is-neg' : 'is-pos'}>{money(net, cur)}</dd>
        {/* Close the second stat box */}
        </div>
      {/* Close the description list */}
      </dl>

      {/* Two-column layout: entry form on one side, latest entries on the other */}
      <div className="register-grid">
        {/* The form: onSubmit runs our submit handler, noValidate disables browser validation bubbles, aria-labelledby names it by the heading id */}
        <form className="card" onSubmit={submit} noValidate aria-labelledby="entry-title">
          {/* Form heading referenced by aria-labelledby */}
          <h2 id="entry-title">New entry</h2>

          {/* Segmented toggle container; role="group" with a label announces it as a group of related buttons */}
          <div className="seg" role="group" aria-label="Entry type">
            {/* Sale button: type="button" so it does not submit; aria-pressed is true when kind is 'sale'; click calls pickKind('sale') */}
            <button type="button" className="is-sale" aria-pressed={kind === 'sale'} onClick={() => pickKind('sale')}>
              {/* Button main text */}
              <span>+ Sale</span>
              {/* Small caption under the main text */}
              <small>Money in</small>
            {/* Close the Sale button */}
            </button>
            {/* Expense button: same pattern, pressed when kind is 'expense' */}
            <button type="button" className="is-expense" aria-pressed={kind === 'expense'} onClick={() => pickKind('expense')}>
              {/* Button main text */}
              <span>− Expense</span>
              {/* Small caption */}
              <small>Money out</small>
            {/* Close the Expense button */}
            </button>
          {/* Close the toggle container */}
          </div>

          {/* Wrapper for the amount field */}
          <div className="field">
            {/* Label linked to the input with id "amt"; shows the currency symbol from the cur prop */}
            <label htmlFor="amt">Amount ({cur})</label>
            {/* Input wrapper; ' is-invalid' is appended to the class only when error is non-empty */}
            <div className={'amount-wrap' + (error ? ' is-invalid' : '')}>
              {/* Decorative currency symbol, hidden from screen readers */}
              <span className="amount-cur" aria-hidden="true">{cur}</span>
              {/* The amount input */}
              <input
                // id matches the label's htmlFor
                id="amt"
                // REF: attach the input DOM element to amountRef so we can focus it from submit()
                ref={amountRef}
                // Numeric input type
                type="number"
                // Hint for mobile keyboards to show a decimal pad
                inputMode="decimal"
                // Minimum allowed value (one cent)
                min="0.01"
                // Maximum allowed value from the finance constants
                max={MAX_CUMULATIVE_TOTAL}
                // Allow steps of one cent
                step="0.01"
                // Greyed hint shown while empty
                placeholder="0.00"
                // CONTROLLED: displayed value comes from the amount state
                value={amount}
                // On every keystroke send the new text to changeAmount, which updates state
                onChange={(e) => changeAmount(e.target.value)}
                // Mark invalid for assistive tech only when an error exists
                aria-invalid={error ? 'true' : undefined}
                // Point to the error paragraph by id only when an error exists
                aria-describedby={error ? 'amt-error' : undefined}
              // Self-closing end of the input
              />
            {/* Close the input wrapper */}
            </div>
            {/* CONDITIONAL RENDER: show the error paragraph only if error is a non-empty string */}
            {error && <p id="amt-error" className="field-error">{error}</p>}
          {/* Close the amount field */}
          </div>

          {/* Wrapper for the description field */}
          <div className="field">
            {/* Label linked to the description input */}
            <label htmlFor="desc">Description (optional)</label>
            {/* The description input */}
            <input
              // id matches the label's htmlFor
              id="desc"
              // Disable browser autofill suggestions for this field
              autoComplete="off"
              // CONTROLLED: displayed value comes from the desc state
              value={desc}
              // On change, store the typed text with setDesc
              onChange={(e) => setDesc(e.target.value)}
              // Placeholder changes with kind: an example sale versus an example expense
              placeholder={kind === 'sale' ? 'e.g. 3 coffee bags' : 'e.g. May rent'}
            // Self-closing end of the input
            />
          {/* Close the description field */}
          </div>

          {/* Field wrapper with the extra "row2" class to lay out two columns (category and date) */}
          <div className="field row2">
            {/* Left column: category */}
            <div>
              {/* Label linked to the select */}
              <label htmlFor="cat">Category</label>
              {/* CONTROLLED select: its selected option comes from the cat state; on change, store the chosen option's value */}
              <select id="cat" value={cat} onChange={(e) => setCat(e.target.value)}>
                {/* ARRAY ITERATION (.map): categories[kind] is the array of category names for the current kind; .map turns each name c into an <option>, and key={c} gives React a unique identity for each. Switching kind swaps the whole list */}
                {categories[kind].map((c) => <option key={c}>{c}</option>)}
              {/* Close the select */}
              </select>
            {/* Close the left column */}
            </div>
            {/* Right column: date */}
            <div>
              {/* Label linked to the date input */}
              <label htmlFor="date">Date</label>
              {/* CONTROLLED date input: value comes from the date state; on change store the new date string */}
              <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {/* Close the right column */}
            </div>
          {/* Close the two-column row */}
          </div>

          {/* Submit button; its label switches between "Record sale" and "Record expense" based on kind */}
          <button className="btn btn-primary" type="submit">Record {kind === 'sale' ? 'sale' : 'expense'}</button>
          {/* Live status paragraph: role="status" makes screen readers announce the notice text when it appears */}
          <p className="form-status" role="status">{notice}</p>
        {/* Close the form */}
        </form>

        {/* Card section for the latest entries, named by the heading below */}
        <section className="card" aria-labelledby="latest-title">
          {/* Section heading referenced by aria-labelledby */}
          <h2 id="latest-title">Latest entries</h2>
          {/* CONDITIONAL RENDER with a ternary: if recent has at least one item (length is truthy), render the list; otherwise the empty message below */}
          {recent.length
            // ARRAY ITERATION (.map): each entry t in recent becomes a TxRow. key={t.id} is the stable unique id; t is passed as the entry data, cur for formatting, and onDelete is forwarded so the row's delete button can tell Tracker which id to remove
            ? <ul className="tx-list">{recent.map((t) => <TxRow key={t.id} t={t} cur={cur} onDelete={onDelete} />)}</ul>
            // Else branch: friendly empty-state paragraph
            : <p className="empty">Nothing yet. Record your first sale or expense.</p>}
        {/* Close the latest-entries section */}
        </section>
      {/* Close the two-column layout */}
      </div>
    {/* Close the fragment */}
    </>
  // Close the parentheses around the returned JSX
  )
// Close the Register function body
}