export const VARIABLE_CATEGORY = 'Inventory / materials'

// Today's date as YYYY-MM-DD in the user's own time zone. (toISOString() is UTC,
// which made the Date field default to "yesterday" before 8 AM in the Philippines.)
export const todayISO = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Display helpers. Entries store dates as 'YYYY-MM-DD'; build a local Date from the
// parts so the shown day never shifts with the viewer's time zone.
const toLocalDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d || 1)
}

export const formatDate = (iso) =>
  toLocalDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

// 'YYYY-MM' -> "Oct 2026" (or "October 2026" when long is true)
export const formatMonth = (key, long = false) =>
  toLocalDate(key + '-01').toLocaleDateString(undefined, { month: long ? 'long' : 'short', year: 'numeric' })

export const money = (n, cur) =>
  (n < 0 ? '-' : '') +
  cur +
  Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const sum = (list) => list.reduce((t, x) => t + x.amt, 0)

export function computeStats(tx, openingCash) {
  const revenue = sum(tx.filter((t) => t.type === 'sale'))
  const expenses = sum(tx.filter((t) => t.type === 'expense'))

  const months = {}
  tx.forEach((t) => {
    const k = t.date.slice(0, 7)
    const mo = (months[k] ||= { r: 0, e: 0, v: 0, f: 0 })
    if (t.type === 'sale') mo.r += t.amt
    else {
      mo.e += t.amt
      if (t.cat === VARIABLE_CATEGORY) mo.v += t.amt
      else mo.f += t.amt
    }
  })

  const keys = Object.keys(months).sort()
  const recent = keys.slice(-3)
  const avg = (f) => (recent.length ? recent.reduce((t, k) => t + months[k][f], 0) / recent.length : 0)
  const avgRev = avg('r'), avgExp = avg('e'), avgVar = avg('v'), avgFixed = avg('f')

  const cash = openingCash + revenue - expenses
  const burn = Math.max(0, avgExp - avgRev)
  const grossMargin = avgRev > 0 ? (avgRev - avgVar) / avgRev : null
  const breakEven = grossMargin && grossMargin > 0 ? avgFixed / grossMargin : null

  return {
    revenue, expenses, net: revenue - expenses, cash, months, keys,
    avgRev, avgExp, avgFixed, grossMargin, breakEven,
    runway: burn > 0 ? cash / burn : null,
    thisMonth: months[todayISO().slice(0, 7)] || { r: 0, e: 0 },
  }
}

export function buildTips(st, cur) {
  const m = (n) => money(n, cur)
  const tips = []
  if (st.cash < 0) tips.push(['bad', 'Your cash is negative. Pause non-essential spending and collect any money owed to you.'])
  if (st.runway !== null) {
    const r = st.runway
    tips.push([
      r < 3 ? 'bad' : r < 6 ? 'warn' : 'good',
      `You spend more than you earn. At the current pace your cash lasts about ${r.toFixed(1)} months. ` +
        (r < 6 ? 'Aim for at least 6 months of runway: cut costs or raise prices.' : 'That is a healthy buffer.'),
    ])
  } else if (st.avgExp > 0) {
    tips.push(['good', 'You are earning more than you spend (recent monthly average). Keep that gap and build a reserve.'])
  }
  if (st.grossMargin !== null) {
    tips.push(['info', `Gross margin: ${(st.grossMargin * 100).toFixed(0)}% of each sale remains after inventory/materials. ` +
      (st.grossMargin < 0.4 ? 'Below 40% is tight for most startups. Check your pricing and supplier costs.' : 'This gives you room to cover fixed costs.')])
  }
  if (st.breakEven !== null) {
    const ok = st.avgRev >= st.breakEven
    tips.push([ok ? 'good' : 'warn', `Break-even: you need about ${m(st.breakEven)} in sales per month to cover fixed costs of ${m(st.avgFixed)}. Your recent average is ${m(st.avgRev)}` +
      (ok ? ', so you are above it.' : `, a gap of ${m(st.breakEven - st.avgRev)}.`)])
  }
  if (st.avgExp > 0 && st.cash > 0 && st.cash < st.avgExp * 3) {
    tips.push(['warn', `Your cash covers under 3 months of expenses (${m(st.avgExp)}/month). Build an emergency reserve.`])
  }
  return tips
}
