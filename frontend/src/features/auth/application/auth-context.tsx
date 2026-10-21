import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useDependencies } from '../../../core/di/dependencies'
import { setUnauthorizedHandler } from '../../../core/http/http-client'
import { tokenStorage } from '../../../core/storage/token-storage'
import type { AuthUser } from '../domain/auth-user'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: Status
  user: AuthUser | null
  /** Motivo por el que se cerró la sesión automáticamente, para mostrarlo en el login. */
  expiredReason: string | null
  loginAdmin: (email: string, password: string) => Promise<AuthUser>
  loginStudent: (identifier: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useDependencies()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<Status>(() => (tokenStorage.get() ? 'loading' : 'anonymous'))
  const [expiredReason, setExpiredReason] = useState<string | null>(null)

  const endSession = useCallback(() => {
    tokenStorage.clear()
    queryClient.clear()
    setUser(null)
    setStatus('anonymous')
  }, [queryClient])

  // Restaura la sesión guardada al recargar la página.
  useEffect(() => {
    if (!tokenStorage.get()) return
    auth
      .me()
      .then((current) => {
        setUser(current)
        setStatus('authenticated')
      })
      .catch(endSession)
  }, [auth, endSession])

  // Si el servidor rechaza el token (expiró o cambió el módulo), se cierra la sesión.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setExpiredReason('Tu sesión terminó. Vuelve a ingresar.')
      endSession()
    })
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  const startSession = useCallback((token: string, current: AuthUser) => {
    tokenStorage.set(token)
    setUser(current)
    setStatus('authenticated')
    setExpiredReason(null)
    return current
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      expiredReason,
      loginAdmin: async (email, password) => {
        const result = await auth.loginAdmin(email, password)
        return startSession(result.accessToken, result.user)
      },
      loginStudent: async (identifier) => {
        const result = await auth.loginStudent(identifier)
        return startSession(result.accessToken, result.user)
      },
      logout: async () => {
        await auth.logout().catch(() => undefined)
        endSession()
      },
    }),
    [auth, status, user, expiredReason, startSession, endSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
