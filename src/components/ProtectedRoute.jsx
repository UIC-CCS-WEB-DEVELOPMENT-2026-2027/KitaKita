import { Navigate, useLocation } from 'react-router-dom'
import Loading from './Loading.jsx'
import { useAuth } from '../hooks/useAuth.js'

// Wrap any page that needs a signed-in user. Remembers where the person was headed,
// so after logging in they land there instead of on the home page.
export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
