/**
 * FILE OVERVIEW: TxRow.jsx
 *
 * WHAT IT DOES:
 *   Renders ONE transaction (sale or expense) as a list item: a title, a category and
 *   date line, a signed amount (+ for sales, − for expenses), and a delete button.
 *
 * WHERE IT FITS:
 *   A small presentational "leaf" component. Register.jsx renders it for each of the
 *   latest entries (via recent.map), and History.jsx most likely does the same for all
 *   entries. It has no state: it displays what it is given and reports clicks upward.
 *
 * REACT MECHANICS USED:
 *   - Props RECEIVED: t (one transaction object: id, type, amt, desc, cat, date),
 *     cur (currency symbol), onDelete (callback from Tracker.deleteTx, forwarded by the parent)
 *   - No useState and no hooks: values are derived from props each render
 *   - Conditional rendering: && (category shown only with a description) and ternaries
 *     (class, sign, screen-reader text)
 *   - Event handler: onClick={() => onDelete(t.id)} sends this entry's id UP to Tracker,
 *     which removes it using .filter
 *   - The `key` prop is set by the PARENT's .map (key={t.id}), not inside this file
 *   - No .map() or .filter() inside this file
 */

// Import formatDate (turns a date string into readable text) and money (formats a number with the currency symbol)
import { formatDate, money } from '../utils/finance.js'

// One entry in a list. Render inside <ul className="tx-list">.
// Export the component; it destructures three props: t (the transaction), cur (currency symbol) and onDelete (callback)
export default function TxRow({ t, cur, onDelete }) {
  // true when this transaction is a sale; used to choose the color class and the sign
  const isSale = t.type === 'sale'
  // Title to show: the description if it is non-empty, otherwise fall back to the category
  const title = t.desc || t.cat
  // Amount text with the currency symbol, e.g. "₱1,200.00"
  const amount = money(t.amt, cur)
  // Human-readable date text made from the stored date string
  const when = formatDate(t.date)

  // Return the row JSX
  return (
    // One list item; this component must be rendered inside a <ul>
    <li className="tx">
      {/* Left block holding the title and the meta line */}
      <div>
        {/* The entry's title */}
        <span className="tx-title">{title}</span>
        {/* Meta line with category and date */}
        <span className="tx-meta">
          {/* CONDITIONAL RENDER: show "category · " only when a description exists (otherwise the title already IS the category); <>...</> is a fragment with no extra element */}
          {t.desc && <>{t.cat} · </>}
          {/* Semantic time element; dateTime holds the machine-readable value and the visible text is the formatted date */}
          <time dateTime={t.date}>{when}</time>
        {/* Close the meta line */}
        </span>
      {/* Close the left block */}
      </div>
      {/* Amount in bold; the class gets 'is-pos' for sales and 'is-neg' for expenses (the trailing space after 'tx-amount ' is needed to separate class names) */}
      <b className={'tx-amount ' + (isSale ? 'is-pos' : 'is-neg')}>
        {/* Screen-reader-only text that announces the type, since sighted users see color and sign instead */}
        <span className="sr-only">{isSale ? 'Sale: ' : 'Expense: '}</span>
        {/* Visible sign (+ for a sale, − for an expense) followed by the formatted amount */}
        {isSale ? '+' : '−'}{amount}
      {/* Close the amount element */}
      </b>
      {/* Delete button */}
      <button
        // type="button" so it never submits a form
        type="button"
        // Styling class
        className="tx-delete"
        // CALLBACK UP: on click, call the parent's onDelete with THIS entry's id; Tracker then uses .filter to remove the entry. The arrow function delays the call until the click (writing onDelete(t.id) directly would run it during render)
        onClick={() => onDelete(t.id)}
        // Accessible name that says exactly which entry will be deleted, e.g. "Delete Rent, ₱500.00 on Oct 1"
        aria-label={`Delete ${title}, ${amount} on ${when}`}
        // Hover tooltip for mouse users
        title="Delete entry"
      // End of the button's opening tag
      >
        {/* Decorative × symbol hidden from screen readers (the aria-label already names the button) */}
        <span aria-hidden="true">×</span>
      {/* Close the button */}
      </button>
    {/* Close the list item */}
    </li>
  // Close the parentheses around the returned JSX
  )
// Close the component function body
}