const KEY = 'asistencia.session'

export interface StoredSession {
  token: string
}

export const tokenStorage = {
  get(): string | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as StoredSession).token : null
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ token } satisfies StoredSession))
    } catch {
      /* almacenamiento no disponible: la sesión dura lo que la pestaña */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignorar */
    }
  },
}
