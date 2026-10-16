import { useEffect, useRef, useState } from 'react'
import ForgotPasswordForm from './ForgotPasswordForm.jsx'
import LoginForm from './LoginForm.jsx'
import SignUpForm from './SignUpForm.jsx'

const TABS = [['login', 'Log In'], ['signup', 'Sign Up']]

export default function Auth() {
  const [view, setView] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('') // carried between Log In and Forgot password
  const headingRef = useRef(null)
  const prevView = useRef(view)

  // Moving to/from the reset screen replaces the whole form, so send focus to its heading
  // to tell keyboard and screen-reader users where they are. Tab switches keep focus on the tab.
  useEffect(() => {
    const from = prevView.current
    prevView.current = view
    if (from !== view && (from === 'forgot' || view === 'forgot')) headingRef.current?.focus()
  }, [view])

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
              {view !== 'forgot' && (
                <nav className="tabs auth-tabs" aria-label="Account">
                  {TABS.map(([id, label]) => (
                    <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
                      {label}
                    </button>
                  ))}
                </nav>
              )}

              {view === 'login' && (
                <LoginForm
                  headingRef={headingRef}
                  initialEmail={email}
                  onForgot={(typed) => { setEmail(typed); setView('forgot') }}
                />
              )}
              {view === 'signup' && <SignUpForm headingRef={headingRef} />}
              {view === 'forgot' && (
                <ForgotPasswordForm
                  headingRef={headingRef}
                  initialEmail={email}
                  onBack={() => setView('login')}
                />
              )}
            </div>

            <p className="note auth-note">
              Accounts and data stay in this browser. This is a demo sign-in, so do not reuse a real password.
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
