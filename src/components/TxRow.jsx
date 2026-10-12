import { formatDate, money } from '../utils/finance.js'

// One entry in a list. Render inside <ul className="tx-list">.
export default function TxRow({ t, cur, onDelete }) {
  const isSale = t.type === 'sale'
  const title = t.desc || t.cat
  const amount = money(t.amt, cur)
  const when = formatDate(t.date)

  return (
    <li className="tx">
      <div>
        <span className="tx-title">{title}</span>
        <span className="tx-meta">
          {t.desc && <>{t.cat} · </>}
          <time dateTime={t.date}>{when}</time>
        </span>
      </div>
      <b className={'tx-amount ' + (isSale ? 'is-pos' : 'is-neg')}>
        <span className="sr-only">{isSale ? 'Sale: ' : 'Expense: '}</span>
        {isSale ? '+' : '−'}{amount}
      </b>
      <button
        type="button"
        className="tx-delete"
        onClick={() => onDelete(t.id)}
        aria-label={`Delete ${title}, ${amount} on ${when}`}
        title="Delete entry"
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  )
}
