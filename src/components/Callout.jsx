// Reuses the app's .tip look (colour + visible text label, never colour alone).
// kind: 'bad' (error) | 'good' (success) | 'warn' | 'info'
export default function Callout({ kind = 'bad', label, children }) {
  return (
    <div className={'tip auth-callout ' + kind} role={kind === 'good' ? 'status' : 'alert'}>
      <span className="tip-label">{label}</span>
      {children}
    </div>
  )
}
