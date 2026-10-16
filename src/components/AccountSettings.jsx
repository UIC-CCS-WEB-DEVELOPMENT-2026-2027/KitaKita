import { Link } from 'react-router-dom'
import ChangePasswordForm from './ChangePasswordForm.jsx'
import ChangeUsernameForm from './ChangeUsernameForm.jsx'
import { LogOutIcon } from './Icons.jsx'
import { useAuth } from '../hooks/useAuth.js'

// The /settings page (signed-in only). Named AccountSettings so it never clashes with
// the existing Settings.jsx panel (opening balance and currency).
export default function AccountSettings() {
  const { user, logout } = useAuth()

  return (
    <div className="wrap">
      <a className="skip-link" href="#main">Skip to main content</a>

      <header className="app-header">
        <div>
          <h1 className="brand"><span className="k1">Kita</span> <span className="k2">Kita</span></h1>
          <p className="tag">cash register for startups</p>
        </div>
        <div className="header-actions">
          <span className="user-name" title={user.username}>{user.username}</span>
          <Link className="btn" to="/">Back to register</Link>
          <button type="button" className="btn" onClick={logout}>
            <LogOutIcon /> Log out
          </button>
        </div>
      </header>

      <main id="main">
        <div className="page-head">
          <h2 className="auth-title">Account settings</h2>
          <p className="auth-sub">Changes apply right away. You stay logged in.</p>
        </div>

        <div className="register-grid">
          <ChangeUsernameForm />
          <ChangePasswordForm />
        </div>
      </main>
    </div>
  )
}
