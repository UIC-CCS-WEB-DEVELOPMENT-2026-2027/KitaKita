import { useState } from 'react'
import categories from '../data/categories.json'
import TxRow from './TxRow.jsx'
import { money, todayISO } from '../utils/finance.js'

export default function Register({ tx, stats, cur, onAdd, onDelete }) {
  const [kind, setKind] = useState('sale')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState(categories.sale[0])
  const [date, setDate] = useState(todayISO())

  const pickKind = (k) => { setKind(k); setCat(categories[k][0]) }

  const submit = (e) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!(amt > 0)) return
    onAdd({ type: kind, amt: Math.round(amt * 100) / 100, desc: desc.trim(), cat, date: date || todayISO() })
    setAmount('')
    setDesc('')
  }

  const net = stats.thisMonth.r - stats.thisMonth.e
  const recent = tx.slice(-5).reverse()

  return (
    <>
      <div className="grid">
        <div className="k"><small>Cash on hand</small><b className={stats.cash < 0 ? 'neg' : ''}>{money(stats.cash, cur)}</b></div>
        <div className="k"><small>This month net</small><b className={net < 0 ? 'neg' : 'pos'}>{money(net, cur)}</b></div>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="seg">
          <button type="button" className={'s ' + (kind === 'sale' ? 'on' : '')} onClick={() => pickKind('sale')}>+ Sale (money in)</button>
          <button type="button" className={'e ' + (kind === 'expense' ? 'on' : '')} onClick={() => pickKind('expense')}>− Expense (money out)</button>
        </div>
        <label htmlFor="amt">Amount ({cur})</label>
        <input id="amt" className="amt" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
        <label htmlFor="desc">Description (optional)</label>
        <input id="desc" value={desc} onChange={(e) => setDesc(e.target.value)}
          placeholder={kind === 'sale' ? 'e.g. 3 coffee bags' : 'e.g. May rent'} />
        <div className="row2">
          <div>
            <label htmlFor="cat">Category</label>
            <select id="cat" value={cat} onChange={(e) => setCat(e.target.value)}>
              {categories[kind].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <button className="go" type="submit">Record {kind === 'sale' ? 'sale' : 'expense'}</button>
      </form>

      <div className="card">
        <h2>Latest entries</h2>
        {recent.length
          ? recent.map((t) => <TxRow key={t.id} t={t} cur={cur} onDelete={onDelete} />)
          : <div className="empty">Nothing yet. Record your first sale or expense above.</div>}
      </div>
    </>
  )
}
