import { useQueryClient, type Query } from '@tanstack/react-query'
import { useEffect } from 'react'
import { connectRealtime } from '../core/realtime/realtime-client'
import { useAuth } from '../features/auth/application/auth-context'

/** Espera breve para juntar varios avisos seguidos (por ejemplo, muchas marcas a la vez) en una sola consulta. */
const DEBOUNCE_MS = 400

/**
 * Tiempo real: cuando otra persona cambia algo, el servidor avisa y se vuelven a consultar los datos
 * que están en pantalla, en 1 o 2 segundos. La actualización cada 30 s sigue como respaldo.
 * Con la pestaña oculta no se consulta nada: se actualiza al volver.
 */
export function RealtimeSync() {
  const { status, user } = useAuth()
  const queryClient = useQueryClient()
  const userKey = status === 'authenticated' && user ? `${user.role}:${user.id}` : null

  useEffect(() => {
    if (!userKey) return

    let timer: ReturnType<typeof setTimeout> | null = null
    let pending = false
    let images = false

    const refresh = () => {
      timer = null
      if (document.hidden) return
      const includeImages = images
      pending = false
      images = false
      void queryClient.invalidateQueries({
        predicate: (query: Query) => includeImages || query.meta?.image !== true,
      })
    }
    const schedule = (withImages = false) => {
      pending = true
      images ||= withImages
      if (!timer) timer = setTimeout(refresh, DEBOUNCE_MS)
    }
    const onVisible = () => {
      if (!document.hidden && pending) refresh()
    }

    const disconnect = connectRealtime({
      onChange: (event) => schedule(event.images === true),
      onReconnect: () => schedule(),
    })
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      if (timer) clearTimeout(timer)
    }
  }, [userKey, queryClient])

  return null
}
