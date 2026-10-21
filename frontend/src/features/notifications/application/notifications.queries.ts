import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDependencies } from '../../../core/di/dependencies'

const key = ['notifications'] as const

/** Notificaciones del módulo activo; se refrescan cada 30 s. */
export function useNotificationFeed(enabled = true) {
  const { notifications } = useDependencies()
  return useQuery({ queryKey: key, queryFn: () => notifications.feed(), refetchInterval: 30_000, enabled })
}

export function useMarkNotificationsSeen() {
  const { notifications } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notifications.markSeen(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
