import { buildTips, formatMonth, money } from '../utils/finance.js'

const SPLIT = [['Reserve', 0.3], ['Reinvest in growth', 0.4], ['Pay yourself', 0.2], ['Set aside for tax', 0.1]]

// Visible label for each tip level, so meaning is never carried by colour alone.
const TIP_LABEL = { good: 'On track', warn: 'Heads up', bad: 'Action needed', info: 'Insight' }

export default function Dashboard({ stats: st, cur, hasData }) {
  if (!hasData) return <div className="card"><p className="empty">Record a few sales and expenses first. Your insights appear here.</p></div>

  const m = (n) => money(n, cur)
  const margin = st.revenue > 0 ? (st.net / st.revenue) * 100 : 0
  const months = st.keys.slice(-6)
  const max = Math.max(1, ...months.map((k) => Math.max(st.months[k].r, st.months[k].e)))
  const monthProfit = st.thisMonth.r - st.thisMonth.e

  const cards = [
    ['Total revenue', m(st.revenue), 'is-pos'],
    ['Total expenses', m(st.expenses), 'is-neg'],
    ['Net profit', m(st.net), st.net < 0 ? 'is-neg' : 'is-pos'],
    ['Profit margin', margin.toFixed(1) + '%', ''],
    ['Cash on hand', m(st.cash), st.cash < 0 ? 'is-neg' : ''],
    ['Avg monthly spend', m(st.avgExp), ''],
  ]

  return (
    <>
      <dl className="stats stats-3">
        {cards.map(([label, value, cls]) => (
          <div className="stat" key={label}><dt>{label}</dt><dd className={cls}>{value}</dd></div>
        ))}
      </dl>

      <section className="card" aria-labelledby="tips-title">
        <h2 id="tips-title">What the numbers suggest</h2>
        <ul className="tips">
          {buildTips(st, cur).map(([level, text], i) => (
            <li key={i} className={'tip ' + level}>
              <span className="tip-label">{TIP_LABEL[level]}</span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="chart-title">
        <h2 id="chart-title">Revenue vs expenses by month</h2>
        <p className="chart-scale">Top line = {m(max)}</p>
        {/* The bars are a picture; the table below carries the exact figures for everyone. */}
        <div
          role="img"
          aria-label={`Bar chart comparing revenue and expenses for the last ${months.length} month${months.length === 1 ? '' : 's'}. Exact figures are in the table below.`}
        >
          <div className="chart-plot">
            {months.map((k) => (
              <div className="chart-col" key={k}>
                <div className="chart-bars">
                  <i className="bar bar-rev" style={{ height: (st.months[k].r / max) * 100 + '%' }} />
                  <i className="bar bar-exp" style={{ height: (st.months[k].e / max) * 100 + '%' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="chart-labels">
            {months.map((k) => <span key={k}>{formatMonth(k)}</span>)}
          </div>
        </div>
        <p className="chart-legend">
          <span><i className="swatch swatch-rev" /> Revenue</span>
          <span><i className="swatch swatch-exp" /> Expenses</span>
        </p>
        <details className="chart-details">
          <summary>View exact figures</summary>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Revenue and expenses for each month shown</caption>
              <thead>
                <tr><th scope="col">Month</th><th scope="col" className="num">Revenue</th><th scope="col" className="num">Expenses</th></tr>
              </thead>
              <tbody>
                {months.map((k) => (
                  <tr key={k}>
                    <th scope="row">{formatMonth(k, true)}</th>
                    <td className="num">{m(st.months[k].r)}</td>
                    <td className="num">{m(st.months[k].e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {monthProfit > 0 && (
        <section className="card" aria-labelledby="split-title">
          <h2 id="split-title">If you save this month's profit ({m(monthProfit)})</h2>
          <dl className="stats stats-4">
            {SPLIT.map(([label, pct]) => (
              <div className="stat" key={label}><dt>{label} · {pct * 100}%</dt><dd>{m(monthProfit * pct)}</dd></div>
            ))}
          </dl>
          <p className="note">A common starter split. Adjust to your situation and local tax rules.</p>
        </section>
      )}
    </>
  )
}
