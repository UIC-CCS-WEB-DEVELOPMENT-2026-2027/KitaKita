/*
 * =============================================================================
 * FILE OVERVIEW: finance.js (utils/finance.js)
 * =============================================================================
 *
 * WHAT THIS FILE DOES
 * -------------------
 * finance.js is a plain JavaScript utility module (NOT a React component: no JSX,
 * no hooks, no props). It holds all the money and date logic for the Kita Kita
 * cash register as pure functions. A pure function returns the same output for
 * the same input and changes nothing outside itself. It:
 *   - defines constants (the "variable cost" category name, the maximum running total),
 *   - sums entries in whole cents (cumulativeTotalCents),
 *   - builds and formats dates (todayISO, formatDate, formatMonth),
 *   - formats money for display (money),
 *   - turns the transaction list into totals, monthly figures, runway, gross
 *     margin and break-even (computeStats),
 *   - turns those stats into plain-English advice messages (buildTips).
 *
 * WHERE IT FITS IN THE APPLICATION ARCHITECTURE
 * ---------------------------------------------
 *   App.jsx (Tracker) imports computeStats, cumulativeTotalCents and
 *   MAX_CUMULATIVE_TOTAL_CENTS. It calls computeStats(tx, open) on every
 *   render and passes the resulting `stats` object down as a prop.
 *   The tab components (Register, Dashboard, History, Budget) are the likely
 *   consumers of the display helpers (money, formatDate, formatMonth,
 *   todayISO, buildTips, VARIABLE_CATEGORY); check their import lines to
 *   confirm which one uses what.
 *   State flow: the data lives in Tracker's useState. This file never holds
 *   state. It only receives the data as arguments and returns new values,
 *   which is why "stats" is derived data and never stored.
 *
 * PRIMARY MECHANICS USED
 * ----------------------
 *   - No useState, no props, no JSX in this file.
 *   - Array iteration (be ready to explain each one):
 *       .reduce()  -> collapse an array into ONE value (sum in cents; sum of
 *                     amounts; average of the last 3 months),
 *       .filter()  -> keep only entries of one type ('sale' or 'expense'),
 *       .forEach() -> loop over every entry to build the `months` grouping object,
 *       .map()     -> convert 'YYYY-MM-DD' text parts into numbers (Number),
 *       .slice()   -> cut the first 7 characters of a date, or the last 3 keys,
 *       .sort()    -> order the month keys oldest to newest,
 *       Object.keys() -> list the month keys of the `months` object.
 *   - Modern JavaScript syntax: numeric separators (1_000_000_000),
 *     default parameters (long = false), array destructuring ([y, m, d]),
 *     logical assignment (||=), optional ternaries, template literals.
 *   - Money is handled in whole CENTS where precision matters, because
 *     decimal maths like 0.1 + 0.2 is not exact in JavaScript.
 *   - Return conventions: null means "cannot be calculated" (for example
 *     runway is null when you are not burning cash). The UI must check for null.
 * =============================================================================
 */

// Export the exact category name that counts as a VARIABLE cost; other expense categories are treated as FIXED costs.
export const VARIABLE_CATEGORY = 'Inventory / materials'

// Export the maximum allowed running total per entry type in currency units (1 billion); the underscores are only for readability.
export const MAX_CUMULATIVE_TOTAL = 1_000_000_000
// Export the same limit in cents (multiply by 100); App.jsx's addTx compares against this value.
export const MAX_CUMULATIVE_TOTAL_CENTS = MAX_CUMULATIVE_TOTAL * 100

// Export cumulativeTotalCents: returns the total, in cents, of all entries whose type matches `type` ('sale' or 'expense').
export function cumulativeTotalCents(tx, type) {
  // .reduce() walks the array; `total` is the running sum so far and `entry` is the current transaction; the callback returns the new running sum.
  return tx.reduce((total, entry) => {
    // If this entry is a different type, skip it by returning the unchanged running total.
    if (entry.type !== type) return total
    // Otherwise add this entry's amount in whole cents (Number() converts text to a number, Math.round removes floating-point noise).
    return total + Math.round(Number(entry.amt) * 100)
  // Close the callback; the 0 is reduce's starting value for `total`.
  }, 0)
// Close the function.
}

// Today's date as YYYY-MM-DD in the user's own time zone. (toISOString() is UTC,
// which made the Date field default to "yesterday" before 8 AM in the Philippines.)
// Export todayISO: an arrow function (no parameters) that returns today's local date as a 'YYYY-MM-DD' string.
export const todayISO = () => {
  // Create a Date object holding the current moment.
  const d = new Date()
  // Small helper: turn a number into text and pad it to 2 characters with a leading 0 (so 5 becomes "05").
  const pad = (n) => String(n).padStart(2, '0')
  // Build the string with a template literal using LOCAL year, month and day; getMonth() is 0-based, so add 1.
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
// Close the arrow function.
}

// Display helpers. Entries store dates as 'YYYY-MM-DD'; build a local Date from the
// parts so the shown day never shifts with the viewer's time zone.
// Module-private helper (not exported): converts a 'YYYY-MM-DD' string into a local Date object.
const toLocalDate = (iso) => {
  // Split the string at "-", then .map(Number) converts each text piece into a number; array destructuring names them year, month, day.
  const [y, m, d] = iso.split('-').map(Number)
  // Create the Date from its parts; month is 0-based so subtract 1; `d || 1` uses day 1 if the day is missing (NaN/undefined).
  return new Date(y, m - 1, d || 1)
// Close the arrow function.
}

// Export formatDate: converts a stored 'YYYY-MM-DD' string into readable text such as "26 Oct 2026".
export const formatDate = (iso) =>
  // Build a local Date, then format it using the user's locale (undefined = browser default) with numeric day, short month name and numeric year.
  toLocalDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

// 'YYYY-MM' -> "Oct 2026" (or "October 2026" when long is true)
// Export formatMonth: `key` is a 'YYYY-MM' month key; `long = false` is a default parameter, so the short month name is used unless true is passed.
export const formatMonth = (key, long = false) =>
  // Append '-01' to make a full date, then format only the month and year; the month style is 'long' or 'short' depending on the `long` flag.
  toLocalDate(key + '-01').toLocaleDateString(undefined, { month: long ? 'long' : 'short', year: 'numeric' })

// Export money: formats number `n` with the currency symbol `cur`, for example "₱1,250.50" or "-₱40.00".
export const money = (n, cur) =>
  // Start with a minus sign for negative numbers, otherwise an empty string (so the sign goes BEFORE the symbol).
  (n < 0 ? '-' : '') +
  // Then the currency symbol passed in (this is the `cur` prop value from Tracker's state).
  cur +
  // Then the absolute value formatted with thousands separators and always exactly 2 decimal places.
  Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Module-private helper: adds up the `amt` field of every item in `list`; .reduce() starts at 0 and `t` is the running total.
const sum = (list) => list.reduce((t, x) => t + x.amt, 0)

// Export computeStats: takes the full transaction array and the opening cash, and returns one object of derived figures (called on every render in Tracker).
export function computeStats(tx, openingCash) {
  // .filter() keeps only 'sale' entries, then sum() totals their amounts: total revenue.
  const revenue = sum(tx.filter((t) => t.type === 'sale'))
  // .filter() keeps only 'expense' entries, then sum() totals their amounts: total expenses.
  const expenses = sum(tx.filter((t) => t.type === 'expense'))

  // Create an empty object used as a dictionary that groups figures by month key ('YYYY-MM').
  const months = {}
  // .forEach() visits every transaction (it returns nothing; it is used here only for its side effect of filling `months`).
  tx.forEach((t) => {
    // Take the first 7 characters of the date ('YYYY-MM-DD' becomes 'YYYY-MM') as the month key.
    const k = t.date.slice(0, 7)
    // ||= means "if months[k] is missing, create it": r = revenue, e = expenses, v = variable costs, f = fixed costs; `mo` points at that month's object.
    const mo = (months[k] ||= { r: 0, e: 0, v: 0, f: 0 })
    // If this entry is a sale, add its amount to that month's revenue.
    if (t.type === 'sale') mo.r += t.amt
    // Otherwise it is an expense, so run the block below.
    else {
      // Add the amount to that month's total expenses.
      mo.e += t.amt
      // If the expense category is the special variable category (inventory/materials), count it as a variable cost.
      if (t.cat === VARIABLE_CATEGORY) mo.v += t.amt
      // Every other expense category is counted as a fixed cost.
      else mo.f += t.amt
    // Close the else block.
    }
  // Close the forEach callback and the call.
  })

  // Object.keys() lists the month keys; .sort() orders them alphabetically, which for 'YYYY-MM' text is also chronological order.
  const keys = Object.keys(months).sort()
  // .slice(-3) takes the LAST three keys, i.e. the three most recent months (or fewer if there are fewer).
  const recent = keys.slice(-3)
  // Helper `avg(f)`: the average of field f ('r', 'e', 'v' or 'f') across the recent months; if there are no recent months it returns 0 to avoid dividing by zero.
  const avg = (f) => (recent.length ? recent.reduce((t, k) => t + months[k][f], 0) / recent.length : 0)
  // Compute the 3-month average revenue, expenses, variable costs and fixed costs by calling avg() four times (comma-separated declarations).
  const avgRev = avg('r'), avgExp = avg('e'), avgVar = avg('v'), avgFixed = avg('f')

  // Current cash = opening cash + all revenue - all expenses.
  const cash = openingCash + revenue - expenses
  // Monthly burn rate: how much more is spent than earned per month; Math.max(0, ...) prevents a negative burn when you are profitable.
  const burn = Math.max(0, avgExp - avgRev)
  // Gross margin as a fraction: the share of revenue left after variable costs; null if there is no revenue (cannot divide by zero).
  const grossMargin = avgRev > 0 ? (avgRev - avgVar) / avgRev : null
  // Break-even monthly sales = fixed costs / gross margin; only calculated when the margin exists and is positive, otherwise null.
  const breakEven = grossMargin && grossMargin > 0 ? avgFixed / grossMargin : null

  // Return one object containing every figure the UI needs (this becomes the `stats` prop).
  return {
    // Shorthand properties (name: name): revenue, expenses, net (profit/loss), cash, the months grouping object, and the sorted month keys.
    revenue, expenses, net: revenue - expenses, cash, months, keys,
    // Shorthand properties for the averages, gross margin and break-even point.
    avgRev, avgExp, avgFixed, grossMargin, breakEven,
    // Runway = how many months the cash will last at the current burn rate; null when burn is 0 (not losing money, so no runway concept).
    runway: burn > 0 ? cash / burn : null,
    // Figures for the current month (looked up by today's 'YYYY-MM' key); if there are no entries this month, fall back to zeros.
    thisMonth: months[todayISO().slice(0, 7)] || { r: 0, e: 0 },
  // Close the returned object.
  }
// Close computeStats.
}

// Export buildTips: takes the stats object and the currency symbol, and returns an array of [level, message] pairs for the UI to display.
export function buildTips(st, cur) {
  // Shortcut helper: m(n) formats a number as money using the given currency symbol.
  const m = (n) => money(n, cur)
  // Start with an empty array; each tip pushed in is a two-item array: [severity, text].
  const tips = []
  // Tip 1: if cash is below zero, push a 'bad' warning telling the user to pause spending and collect money owed.
  if (st.cash < 0) tips.push(['bad', 'Your cash is negative. Pause non-essential spending and collect any money owed to you.'])
  // Runway exists (not null) only when the business is burning cash; check this first.
  if (st.runway !== null) {
    // Copy the runway number into a short variable name for readability.
    const r = st.runway
    // Push a tip made of a severity level and a message.
    tips.push([
      // Severity by runway: under 3 months is 'bad', under 6 is 'warn', otherwise 'good'.
      r < 3 ? 'bad' : r < 6 ? 'warn' : 'good',
      // Message part 1: a template literal inserts the runway rounded to 1 decimal place; the + joins it to part 2.
      `You spend more than you earn. At the current pace your cash lasts about ${r.toFixed(1)} months. ` +
        // Message part 2: advice depends on the runway length (under 6 months gets a warning, otherwise reassurance).
        (r < 6 ? 'Aim for at least 6 months of runway: cut costs or raise prices.' : 'That is a healthy buffer.'),
    // Close the tip array and the push call.
    ])
  // If there is no runway but the user does have expenses, they are earning more than they spend.
  } else if (st.avgExp > 0) {
    // Push a positive 'good' tip encouraging them to keep the gap and build a reserve.
    tips.push(['good', 'You are earning more than you spend (recent monthly average). Keep that gap and build a reserve.'])
  // Close the runway if / else-if block.
  }
  // Only give a gross-margin tip when the margin could be calculated (not null).
  if (st.grossMargin !== null) {
    // Push an 'info' tip; the template literal converts the fraction to a whole-number percentage with toFixed(0).
    tips.push(['info', `Gross margin: ${(st.grossMargin * 100).toFixed(0)}% of each sale remains after inventory/materials. ` +
      // Add a second sentence: below 40% (0.4) is called tight; otherwise it says there is room for fixed costs.
      (st.grossMargin < 0.4 ? 'Below 40% is tight for most startups. Check your pricing and supplier costs.' : 'This gives you room to cover fixed costs.')])
  // Close the gross-margin if block.
  }
  // Only give a break-even tip when the break-even point could be calculated.
  if (st.breakEven !== null) {
    // `ok` is true when recent average revenue meets or exceeds the break-even sales level.
    const ok = st.avgRev >= st.breakEven
    // Push a tip: 'good' if above break-even, otherwise 'warn'; the message uses m() to format the needed sales, the fixed costs and the recent average.
    tips.push([ok ? 'good' : 'warn', `Break-even: you need about ${m(st.breakEven)} in sales per month to cover fixed costs of ${m(st.avgFixed)}. Your recent average is ${m(st.avgRev)}` +
      // Finish the sentence: either "above it", or state the shortfall (break-even minus actual average).
      (ok ? ', so you are above it.' : `, a gap of ${m(st.breakEven - st.avgRev)}.`)])
  // Close the break-even if block.
  }
  // Emergency-reserve tip: only when there are expenses, the cash is positive, and cash is less than 3 months of average expenses.
  if (st.avgExp > 0 && st.cash > 0 && st.cash < st.avgExp * 3) {
    // Push a 'warn' tip telling the user to build an emergency reserve, showing the monthly expense average in money format.
    tips.push(['warn', `Your cash covers under 3 months of expenses (${m(st.avgExp)}/month). Build an emergency reserve.`])
  // Close the emergency-reserve if block.
  }
  // Return the finished array of tips; the Dashboard can .map() over it to render each message.
  return tips
// Close buildTips.
}