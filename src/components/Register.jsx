import { useRef, useState } from 'react'
import categories from '../data/categories.json'
import TxRow from './TxRow.jsx'
import {
  money,
  todayISO,
  cumulativeTotalCents,
  MAX_CUMULATIVE_TOTAL,
  MAX_CUMULATIVE_TOTAL_CENTS,
} from '../utils/finance.js'

export default function Register({ tx, stats, cur, onAdd, onDelete }) {
  const [kind, setKind] = useState('sale')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState(categories.sale[0])
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const amountRef = useRef(null)

  const pickKind = (k) => {
    setKind(k)
    setCat(categories[k][0])
    setError('')
    setNotice('')
  }

  const changeAmount = (value) => {
    setAmount(value)
    setError('')
    setNotice('')
  }

  const submit = (e) => {
    e.preventDefault()

    const amt = parseFloat(amount)

    if (!(amt > 0) || !Number.isFinite(amt)) {
      setError('Enter an amount greater than zero.')
      setNotice('')
      amountRef.current?.focus()
      return
    }

    const amountCents = Math.round(amt * 100)

    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      setError('Enter a valid amount.')
      setNotice('')
      amountRef.current?.focus()
      return
    }

    const currentCents = cumulativeTotalCents(tx, kind)

    if (currentCents + amountCents > MAX_CUMULATIVE_TOTAL_CENTS) {
      const remainingCents = Math.max(
        0,
        MAX_CUMULATIVE_TOTAL_CENTS - currentCents
      )

      setError(
        `This transaction would exceed the cumulative ${
          kind === 'sale' ? 'sales' : 'expenses'
        } limit of ${money(MAX_CUMULATIVE_TOTAL, cur)}. ` +
        `Current total: ${money(currentCents / 100, cur)}. ` +
        `Remaining limit: ${money(remainingCents / 100, cur)}.`
      )
      setNotice('')
      amountRef.current?.focus()
      return
    }

    const entry = {
      type: kind,
      amt: amountCents / 100,
      desc: desc.trim(),
      cat,
      date: date || todayISO(),
    }

    if (onAdd(entry) === false) {
      setError('This transaction exceeds the cumulative limit and was not saved.')
      setNotice('')
      amountRef.current?.focus()
      return
    }

    setAmount('')
    setDesc('')
    setError('')
    setNotice(`${kind === 'sale' ? 'Sale' : 'Expense'} of ${money(entry.amt, cur)} recorded.`)
  }

  const net = stats.thisMonth.r - stats.thisMonth.e
  const recent = tx.slice(-5).reverse()

  return (
    <>
      <dl className="stats">
        <div className="stat">
          <dt>Cash on hand</dt>
          <dd className={stats.cash < 0 ? 'is-neg' : ''}>{money(stats.cash, cur)}</dd>
        </div>
        <div className="stat">
          <dt>This month net</dt>
          <dd className={net < 0 ? 'is-neg' : 'is-pos'}>{money(net, cur)}</dd>
        </div>
      </dl>

      <div className="register-grid">
        <form className="card" onSubmit={submit} noValidate aria-labelledby="entry-title">
          <h2 id="entry-title">New entry</h2>

          <div className="seg" role="group" aria-label="Entry type">
            <button type="button" className="is-sale" aria-pressed={kind === 'sale'} onClick={() => pickKind('sale')}>
              <span>+ Sale</span>
              <small>Money in</small>
            </button>
            <button type="button" className="is-expense" aria-pressed={kind === 'expense'} onClick={() => pickKind('expense')}>
              <span>− Expense</span>
              <small>Money out</small>
            </button>
          </div>

          <div className="field">
            <label htmlFor="amt">Amount ({cur})</label>
            <div className={'amount-wrap' + (error ? ' is-invalid' : '')}>
              <span className="amount-cur" aria-hidden="true">{cur}</span>
              <input
                id="amt"
                ref={amountRef}
                type="number"
                inputMode="decimal"
                min="0.01"
                max={MAX_CUMULATIVE_TOTAL}
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => changeAmount(e.target.value)}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'amt-error' : undefined}
              />
            </div>
            {error && <p id="amt-error" className="field-error">{error}</p>}
          </div>

          <div className="field">
            <label htmlFor="desc">Description (optional)</label>
            <input
              id="desc"
              autoComplete="off"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={kind === 'sale' ? 'e.g. 3 coffee bags' : 'e.g. May rent'}
            />
          </div>

          <div className="field row2">
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

          <button className="btn btn-primary" type="submit">Record {kind === 'sale' ? 'sale' : 'expense'}</button>
          <p className="form-status" role="status">{notice}</p>
        </form>

        <section className="card" aria-labelledby="latest-title">
          <h2 id="latest-title">Latest entries</h2>
          {recent.length
            ? <ul className="tx-list">{recent.map((t) => <TxRow key={t.id} t={t} cur={cur} onDelete={onDelete} />)}</ul>
            : <p className="empty">Nothing yet. Record your first sale or expense.</p>}
        </section>
      </div>
    </>
  )
}
