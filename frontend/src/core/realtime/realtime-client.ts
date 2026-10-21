import { io, type Socket } from 'socket.io-client'
import { env } from '../config/env'
import { tokenStorage } from '../storage/token-storage'

/** Aviso del servidor: algo cambió. No trae datos; quien lo recibe vuelve a consultar la API. */
export interface RealtimeEvent {
  action: string
  /** true si cambió una imagen (foto del docente). */
  images?: boolean
}

/**
 * Abre la conexión en tiempo real con el mismo token de la API. Se reconecta sola si se corta;
 * `onReconnect` avisa al volver, porque mientras estuvo caída pudo perderse algún aviso.
 */
export function connectRealtime(handlers: {
  onChange: (event: RealtimeEvent) => void
  onReconnect: () => void
}): () => void {
  // El WebSocket vive en el mismo servidor que la API, en <api>/socket.io (por defecto /api/socket.io).
  const api = new URL(env.apiUrl, window.location.origin)
  const socket: Socket = io(api.origin, {
    path: `${api.pathname.replace(/\/$/, '')}/socket.io`,
    // Función: en cada reconexión se lee el token vigente.
    auth: (cb) => cb({ token: tokenStorage.get() }),
  })

  let wasConnected = false
  socket.on('connect', () => {
    if (wasConnected) handlers.onReconnect()
    wasConnected = true
  })
  socket.on('changed', handlers.onChange)

  return () => {
    socket.removeAllListeners()
    socket.disconnect()
  }
}
