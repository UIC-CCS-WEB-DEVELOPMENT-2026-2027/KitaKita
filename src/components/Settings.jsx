export default function Settings({ open, cur, onChange }) {
  return (
    <section className="card" id="settings-panel" aria-labelledby="settings-title">
      <h2 id="settings-title">Settings</h2>
      <div className="row2">
        <div>
          <label htmlFor="open">Opening cash balance</label>
          <input id="open" type="number" inputMode="decimal" value={open}
            onChange={(e) => onChange({ open: parseFloat(e.target.value) || 0 })}
            aria-describedby="open-hint" />
          <p id="open-hint" className="hint">Cash you had before your first entry.</p>
        </div>
        <div>
          <label htmlFor="cur">Currency symbol</label>
          <input id="cur" maxLength={4} autoComplete="off" value={cur}
            onChange={(e) => onChange({ cur: e.target.value })}
            aria-describedby="cur-hint" />
          <p id="cur-hint" className="hint">Shown before every amount.</p>
        </div>
      </div>
    </section>
  )
}
