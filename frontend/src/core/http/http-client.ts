import axios from 'axios'
import { env } from '../config/env'
import { tokenStorage } from '../storage/token-storage'

export const http = axios.create({ baseURL: env.apiUrl })

let onUnauthorized: (() => void) | null = null

/** Permite a la capa de auth reaccionar cuando el servidor rechaza la sesión. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

http.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = String(error.config?.url ?? '').includes('/login')
    if (error.response?.status === 401 && !isLogin && tokenStorage.get()) {
      tokenStorage.clear()
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)
