import { money } from '../utils/finance.js'

export default function TxRow({ t, cur, onDelete }) {
  const isSale = t.type === 'sale'
  return (
    <div className="tx">
      <div>
        {t.desc || t.cat}
        <small>{t.cat} · {t.date}</small>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <b className={isSale ? 'pos' : 'neg'}>{isSale ? '+' : '−'}{money(t.amt, cur)}</b>
        <button onClick={() => onDelete(t.id)} aria-label="Delete entry" title="Delete">×</button>
      </div>
    </div>
  )
}
