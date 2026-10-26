/**
 * FILE OVERVIEW: ProtectedRoute.jsx
 *
 * WHAT IT DOES:
 *   A "route guard" wrapper component. It renders its children (the protected page)
 *   only if a user is signed in. While auth is still loading it shows <Loading />,
 *   and if nobody is signed in it redirects to /login and remembers the page that
 *   was requested.
 *
 * WHERE IT FITS:
 *   Used in the router setup around any page that requires login, e.g.
 *   <ProtectedRoute><Register /></ProtectedRoute>. It works together with Login.jsx:
 *   this file writes `state.from`, and Login.jsx reads `location.state.from` to send
 *   the user back after logging in.
 *
 * REACT MECHANICS USED:
 *   - Props RECEIVED: `children` (whatever JSX is nested inside <ProtectedRoute>)
 *   - Custom hook useAuth() -> { user, ready }
 *   - useLocation() from react-router-dom to read the current path
 *   - Conditional rendering with early returns
 *   - <Navigate replace state={{ from }}> to redirect and pass data along
 *   - No useState and no .map()/.filter() in this file
 */

// Import Navigate (redirect component) and useLocation (hook for the current URL) from react-router-dom
import { Navigate, useLocation } from 'react-router-dom'
// Import the Loading component shown while auth status is not yet known
import Loading from './Loading.jsx'
// Import the custom auth hook that exposes the current user and the ready flag
import { useAuth } from '../hooks/useAuth.js'

// Wrap any page that needs a signed-in user. Remembers where the person was headed,
// so after logging in they land there instead of on the home page.
// Export the component; it destructures one prop, `children`, which is the protected page passed between the opening and closing tags
export default function ProtectedRoute({ children }) {
  // Read the shared auth state: `user` (signed-in user or null) and `ready` (true once the stored session has been checked)
  const { user, ready } = useAuth()
  // Get the current location; its pathname is the URL the person is trying to open
  const location = useLocation()

  // While auth is not ready, show the Loading component, so a signed-in user is not wrongly redirected before their session is read
  if (!ready) return <Loading />
  // Auth is ready but there is no user: redirect to /login, replacing the history entry, and pass { from: current path } as router state so Login.jsx can send them back afterwards
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  // Auth is ready and a user exists: render the protected page (the children prop)
  return children
// Close the component function body
}