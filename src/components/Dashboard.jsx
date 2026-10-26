/*
 * =============================================================================
 * FILE OVERVIEW: Dashboard.jsx
 * =============================================================================
 * WHAT IT DOES:
 *   Renders the "insights" view: six summary stat cards, a list of advice
 *   tips, a revenue-vs-expenses bar chart (with an accessible data table), and
 *   a suggested split of this month's profit (reserve, reinvest, pay yourself,
 *   tax).
 *
 * WHERE IT FITS:
 *   It is a PRESENTATIONAL (display-only) child component. The parent (App.jsx)
 *   computes the statistics once and passes them down. This file does no
 *   calculating of its own beyond simple arithmetic for display, and it owns
 *   NO state.
 *
 * PRIMARY REACT MECHANICS:
 *   - Props received (from the parent):
 *       stats   (renamed to st on destructuring): the pre-computed numbers
 *               object (revenue, expenses, net, cash, months, keys, thisMonth,
 *               avgExp).
 *       cur     the currency symbol, used for formatting money.
 *       hasData boolean, false means show an empty-state message instead.
 *   - No useState: everything is derived from props on each render.
 *   - Early return (guard clause) when there is no data.
 *   - .map() used 5 times:
 *       cards.map           -> stat cards
 *       buildTips(...).map  -> tip list items
 *       months.map (x3)     -> chart columns, chart labels, table rows
 *       SPLIT.map           -> the 4 profit-split cards
 *   - .slice(-6) takes the last six month keys (not a filter, but array trimming).
 *   - Conditional rendering with && (the split card only appears when profit is above 0).
 *   - key prop on every mapped element so React can track list items.
 *   - Accessibility: visible tip labels (meaning not carried by colour alone),
 *     role="img" with aria-label on the chart, and a real table fallback.
 * =============================================================================
 */

// Import three helper functions: buildTips (creates advice), formatMonth (pretty month names) and money (formats currency).
import { buildTips, formatMonth, money } from '../utils/finance.js'

// Constant array of [label, fraction] pairs describing how to split profit; used later with .map() to render four cards.
const SPLIT = [['Reserve', 0.3], ['Reinvest in growth', 0.4], ['Pay yourself', 0.2], ['Set aside for tax', 0.1]]

// Visible label for each tip level, so meaning is never carried by colour alone.
// Lookup object mapping each tip level code to the human-readable word shown beside the tip.
const TIP_LABEL = { good: 'On track', warn: 'Heads up', bad: 'Action needed', info: 'Insight' }

// Declare and default-export the Dashboard component; the props object is destructured in the parameter list, and stats is renamed to st.
export default function Dashboard({ stats: st, cur, hasData }) {
  // Guard clause: if the parent says there is no data, return only an empty-state card and skip all the work below.
  if (!hasData) return <div className="card"><p className="empty">Record a few sales and expenses first. Your insights appear here.</p></div>

  // Small helper: m(n) formats any number as money using the cur prop so every amount uses the same currency symbol.
  const m = (n) => money(n, cur)
  // Profit margin percentage = net profit divided by revenue times 100, guarded so we never divide by zero.
  const margin = st.revenue > 0 ? (st.net / st.revenue) * 100 : 0
  // Take only the last six month keys from the sorted keys array; .slice(-6) copies the final six entries.
  const months = st.keys.slice(-6)
  // Find the largest single revenue or expense among the shown months, used as the 100 percent bar height; the 1 prevents max from being 0.
  const max = Math.max(1, ...months.map((k) => Math.max(st.months[k].r, st.months[k].e)))
  // This month's profit = revenue minus expenses for the current month.
  const monthProfit = st.thisMonth.r - st.thisMonth.e

  // Array of [label, formatted value, CSS class] triples that drive the six stat cards.
  const cards = [
    // Card 1: total revenue, always styled positive.
    ['Total revenue', m(st.revenue), 'is-pos'],
    // Card 2: total expenses, always styled negative.
    ['Total expenses', m(st.expenses), 'is-neg'],
    // Card 3: net profit, class depends on whether it is below zero (negative style) or not (positive style).
    ['Net profit', m(st.net), st.net < 0 ? 'is-neg' : 'is-pos'],
    // Card 4: profit margin rounded to one decimal place with a percent sign; no special class.
    ['Profit margin', margin.toFixed(1) + '%', ''],
    // Card 5: cash on hand, styled negative only if cash is below zero.
    ['Cash on hand', m(st.cash), st.cash < 0 ? 'is-neg' : ''],
    // Card 6: average monthly spending; no special class.
    ['Avg monthly spend', m(st.avgExp), ''],
  // Close the cards array.
  ]

  // Return the JSX for the whole dashboard.
  return (
    // Empty fragment: groups many sibling elements without adding an extra DOM node.
    <>
      {/* Definition list used as the stat-card container; stats-3 is a three-column grid class. */}
      <dl className="stats stats-3">
        {/* Loop over the cards array; the parameter destructures each triple into label, value and cls. */}
        {cards.map(([label, value, cls]) => (
          // One card per entry; key={label} gives React a stable unique identity for this list item.
          <div className="stat" key={label}><dt>{label}</dt><dd className={cls}>{value}</dd></div>
        // Close the .map() callback and expression.
        ))}
      {/* Close the definition list. */}
      </dl>

      {/* Tips card; aria-labelledby ties the section to its heading for screen readers. */}
      <section className="card" aria-labelledby="tips-title">
        {/* Heading for the tips section; the id matches aria-labelledby above. */}
        <h2 id="tips-title">What the numbers suggest</h2>
        {/* Unordered list that will hold one list item per tip. */}
        <ul className="tips">
          {/* buildTips returns an array of [level, text] pairs; .map() turns each pair into a list item; i is the index used as the key. */}
          {buildTips(st, cur).map(([level, text], i) => (
            // List item whose CSS class combines "tip " with the level (good, warn, bad, info) for colour styling; the index is used as key because tips have no id.
            <li key={i} className={'tip ' + level}>
              {/* Visible word label looked up from TIP_LABEL so the level is not communicated by colour alone. */}
              <span className="tip-label">{TIP_LABEL[level]}</span>
              {/* The tip sentence itself, from the second element of each pair. */}
              {text}
            {/* Close the list item. */}
            </li>
          // Close the .map() callback and expression.
          ))}
        {/* Close the tips list. */}
        </ul>
      {/* Close the tips section. */}
      </section>

      {/* Chart card; aria-labelledby points at the heading id below. */}
      <section className="card" aria-labelledby="chart-title">
        {/* Heading for the chart section. */}
        <h2 id="chart-title">Revenue vs expenses by month</h2>
        {/* Tells the reader what value the top of the chart represents (the max computed above), formatted as money. */}
        <p className="chart-scale">Top line = {m(max)}</p>
        {/* The bars are a picture; the table below carries the exact figures for everyone. */}
        {/* Wrapper that screen readers treat as one image. */}
        <div
          // role="img" makes assistive tech treat the whole chart as a single image rather than reading each bar.
          role="img"
          // Template literal builds a description with the number of months, and picks singular or plural with a ternary.
          aria-label={`Bar chart comparing revenue and expenses for the last ${months.length} month${months.length === 1 ? '' : 's'}. Exact figures are in the table below.`}
        // End of the opening tag.
        >
          {/* Container for the bar columns. */}
          <div className="chart-plot">
            {/* Loop over the month keys to create one column per month. */}
            {months.map((k) => (
              // Column wrapper; key={k} uses the month key (unique) so React tracks each column.
              <div className="chart-col" key={k}>
                {/* Holds the two bars for this month side by side. */}
                <div className="chart-bars">
                  {/* Revenue bar: inline style height is revenue divided by max, as a percentage, so bars scale relative to the biggest value. */}
                  <i className="bar bar-rev" style={{ height: (st.months[k].r / max) * 100 + '%' }} />
                  {/* Expense bar: same percentage calculation using the expense value e. */}
                  <i className="bar bar-exp" style={{ height: (st.months[k].e / max) * 100 + '%' }} />
                {/* Close the bars wrapper. */}
                </div>
              {/* Close the column. */}
              </div>
            // Close the .map() callback and expression.
            ))}
          {/* Close the chart-plot container. */}
          </div>
          {/* Row of month labels under the bars. */}
          <div className="chart-labels">
            {/* Second loop over months: render one short month label per column using formatMonth. */}
            {months.map((k) => <span key={k}>{formatMonth(k)}</span>)}
          {/* Close the labels row. */}
          </div>
        {/* Close the role="img" wrapper. */}
        </div>
        {/* Legend paragraph explaining which colour is which. */}
        <p className="chart-legend">
          {/* Revenue legend item: a coloured swatch plus text. */}
          <span><i className="swatch swatch-rev" /> Revenue</span>
          {/* Expenses legend item: a coloured swatch plus text. */}
          <span><i className="swatch swatch-exp" /> Expenses</span>
        {/* Close the legend paragraph. */}
        </p>
        {/* Native collapsible element that hides the data table until the user opens it. */}
        <details className="chart-details">
          {/* The clickable label that toggles the details open and closed. */}
          <summary>View exact figures</summary>
          {/* Wrapper that allows the table to scroll horizontally on small screens. */}
          <div className="table-wrap">
            {/* The accessible table version of the chart data. */}
            <table>
              {/* Caption visible only to screen readers (class sr-only) describing the table. */}
              <caption className="sr-only">Revenue and expenses for each month shown</caption>
              {/* Table head section. */}
              <thead>
                {/* Header row with three column headers; scope="col" tells assistive tech these head the columns. */}
                <tr><th scope="col">Month</th><th scope="col" className="num">Revenue</th><th scope="col" className="num">Expenses</th></tr>
              {/* Close the table head. */}
              </thead>
              {/* Table body section. */}
              <tbody>
                {/* Third loop over months: create one table row per month. */}
                {months.map((k) => (
                  // Row keyed by the month key.
                  <tr key={k}>
                    {/* Row header cell with the long month name (formatMonth with true); scope="row" marks it as the header for the row. */}
                    <th scope="row">{formatMonth(k, true)}</th>
                    {/* Revenue cell formatted as money; num class right-aligns numbers. */}
                    <td className="num">{m(st.months[k].r)}</td>
                    {/* Expenses cell formatted as money. */}
                    <td className="num">{m(st.months[k].e)}</td>
                  {/* Close the row. */}
                  </tr>
                // Close the .map() callback and expression.
                ))}
              {/* Close the table body. */}
              </tbody>
            {/* Close the table. */}
            </table>
          {/* Close the table wrapper. */}
          </div>
        {/* Close the details element. */}
        </details>
      {/* Close the chart section. */}
      </section>

      {/* Conditional rendering: the && operator renders the section only when monthProfit is above 0; otherwise it renders nothing. */}
      {monthProfit > 0 && (
        // Profit-split card, only shown for a profitable month.
        <section className="card" aria-labelledby="split-title">
          {/* Heading that includes this month's profit formatted as money. */}
          <h2 id="split-title">If you save this month's profit ({m(monthProfit)})</h2>
          {/* Four-column stat list for the split cards. */}
          <dl className="stats stats-4">
            {/* Loop over the SPLIT constant; each pair is destructured into label and pct (a fraction like 0.3). */}
            {SPLIT.map(([label, pct]) => (
              // One card per split bucket; key is the label; the text shows the label and the percent (fraction times 100); the value is profit times the fraction.
              <div className="stat" key={label}><dt>{label} · {pct * 100}%</dt><dd>{m(monthProfit * pct)}</dd></div>
            // Close the .map() callback and expression.
            ))}
          {/* Close the split stat list. */}
          </dl>
          {/* Disclaimer note that this is only a generic starter split. */}
          <p className="note">A common starter split. Adjust to your situation and local tax rules.</p>
        {/* Close the split section. */}
        </section>
      // Close the parentheses of the conditional expression.
      )}
    {/* Close the fragment. */}
    </>
  // Close the parentheses that wrap the returned JSX.
  )
// Close the Dashboard function body.
}