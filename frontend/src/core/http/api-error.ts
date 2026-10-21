import { isAxiosError } from 'axios'

export interface ApiErrorBody {
  statusCode: number
  error?: string
  message: string | string[]
  details?: unknown
}

/** Extrae un mensaje legible de cualquier error de la API. */
export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return 'No se pudo conectar con el servidor'
    const message = error.response.data?.message
    if (Array.isArray(message)) return message.join('. ')
    if (message) return message
  }
  return fallback
}

export function getErrorDetails<T>(error: unknown): T | null {
  if (isAxiosError<ApiErrorBody>(error)) return (error.response?.data?.details as T) ?? null
  return null
}
