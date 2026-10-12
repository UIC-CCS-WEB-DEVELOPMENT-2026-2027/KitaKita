export default function Settings({ open, cur, onChange }) {
  return (
    <div className="card">
      <h2>Settings</h2>
      <div className="row2">
        <div>
          <label htmlFor="open">Opening cash balance</label>
          <input id="open" type="number" inputMode="decimal" value={open}
            onChange={(e) => onChange({ open: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label htmlFor="cur">Currency symbol</label>
          <input id="cur" maxLength={4} value={cur} onChange={(e) => onChange({ cur: e.target.value })} />
        </div>
      </div>
    </div>
  )
}
