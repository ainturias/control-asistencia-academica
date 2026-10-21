import { Navigate, Outlet } from 'react-router'
import { PageLoader } from '../../../shared/ui/Spinner'
import { useAuth } from '../application/auth-context'
import { homePathFor, type Role } from '../domain/auth-user'

/** RF-02: restringe las rutas al rol indicado. */
export function RequireRole({ role }: { role: Role }) {
  const { status, user } = useAuth()
  if (status === 'loading') return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />
  return <Outlet />
}

export function HomeRedirect() {
  const { status, user } = useAuth()
  if (status === 'loading') return <PageLoader />
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}
