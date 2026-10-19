import { Navigate, useLocation } from 'react-router-dom'
import Loading from './Loading.jsx'
import LoginForm from './LoginForm.jsx'
import { useAuth } from '../hooks/useAuth.js'

// The /login page. Already signed in? Go straight to where the person was headed.
export default function Login() {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <Loading />
  if (user) return <Navigate to={location.state?.from || '/'} replace />

  return (
    <div className="wrap">
      <a className="skip-link" href="#main">Skip to main content</a>

      <div className="auth-page">
        <header className="app-header">
          <div>
            <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
            <p className="tag">cash register for startups</p>
          </div>
        </header>

        <div className="auth-layout">
          <main id="main">
            <div className="card auth-card">
              <LoginForm />
            </div>
            <p className="note auth-note">
              Prototype sign-in: the account and your data stay in this browser.
            </p>
          </main>

          <aside className="card auth-aside" aria-labelledby="aside-title">
            <h2 id="aside-title">Know where your cash stands</h2>
            <p>Record sales and expenses as they happen, then see your runway, break-even point and profit split.</p>
            <ul className="auth-benefits">
              <li>A quick register for sales and expenses</li>
              <li>Monthly insights in plain language</li>
              <li>Export every entry to CSV</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  )
}
