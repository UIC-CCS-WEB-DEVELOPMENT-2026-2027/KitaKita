import { buildTips, money } from '../utils/finance.js'

const SPLIT = [['Reserve', 0.3], ['Reinvest in growth', 0.4], ['Pay yourself', 0.2], ['Set aside for tax', 0.1]]

export default function Dashboard({ stats: st, cur, hasData }) {
  if (!hasData) return <div className="card empty">Record a few sales and expenses first. Your insights appear here.</div>

  const m = (n) => money(n, cur)
  const margin = st.revenue > 0 ? (st.net / st.revenue) * 100 : 0
  const months = st.keys.slice(-6)
  const max = Math.max(1, ...months.map((k) => Math.max(st.months[k].r, st.months[k].e)))
  const monthProfit = st.thisMonth.r - st.thisMonth.e

  const cards = [
    ['Total revenue', m(st.revenue), 'pos'],
    ['Total expenses', m(st.expenses), 'neg'],
    ['Net profit', m(st.net), st.net < 0 ? 'neg' : 'pos'],
    ['Profit margin', margin.toFixed(1) + '%', ''],
    ['Cash on hand', m(st.cash), st.cash < 0 ? 'neg' : ''],
    ['Avg monthly spend', m(st.avgExp), ''],
  ]

  return (
    <>
      <div className="grid">
        {cards.map(([label, value, cls]) => (
          <div className="k" key={label}><small>{label}</small><b className={cls}>{value}</b></div>
        ))}
      </div>

      <div className="card">
        <h2>What the numbers suggest</h2>
        {buildTips(st, cur).map(([level, text], i) => <div key={i} className={'tip ' + level}>{text}</div>)}
      </div>

      <div className="card">
        <h2>Revenue vs expenses (last months)</h2>
        <div className="chart">
          {months.map((k) => (
            <div className="col" key={k}>
              <div className="bars">
                <i className="r" style={{ height: (st.months[k].r / max) * 100 + '%' }} />
                <i className="x" style={{ height: (st.months[k].e / max) * 100 + '%' }} />
              </div>
              <span>{k.slice(2)}</span>
            </div>
          ))}
        </div>
        <div className="lg"><span className="pos">■</span> Revenue &nbsp; <span className="neg">■</span> Expenses</div>
      </div>

      {monthProfit > 0 && (
        <div className="card">
          <h2>If you save this month's profit ({m(monthProfit)})</h2>
          <div className="grid" style={{ margin: 0 }}>
            {SPLIT.map(([label, pct]) => (
              <div className="k" key={label}><small>{label} · {pct * 100}%</small><b>{m(monthProfit * pct)}</b></div>
            ))}
          </div>
          <p className="note" style={{ marginBottom: 0 }}>A common starter split. Adjust to your situation and local tax rules.</p>
        </div>
      )}
    </>
  )
}
