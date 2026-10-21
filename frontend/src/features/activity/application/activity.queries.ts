import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDependencies } from '../../../core/di/dependencies'
import type { ActivityFilters } from '../domain/activity'

/** RF-10 */
export function useActivity(filters: ActivityFilters) {
  const { activity } = useDependencies()
  return useQuery({
    queryKey: ['activity', filters],
    queryFn: () => activity.list(filters),
    placeholderData: keepPreviousData,
  })
}

/** Actividad de un día, refrescada cada 30 s (alimenta las notificaciones del admin). */
export function useDayActivity(date: string, enabled = true) {
  const { activity } = useDependencies()
  return useQuery({
    queryKey: ['activity', 'day', date],
    queryFn: () => activity.list({ date, page: 1, pageSize: 100 }),
    refetchInterval: 30_000,
    enabled,
  })
}
