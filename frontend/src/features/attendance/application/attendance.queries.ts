import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDependencies } from '../../../core/di/dependencies'
import type { OverviewFilters, UpdateAttendanceInput } from '../domain/attendance'

export const attendanceKeys = {
  mine: ['attendance', 'mine'] as const,
  student: (studentId: number, moduleId?: number) => ['attendance', 'student', studentId, moduleId ?? 'active'] as const,
  overview: (filters: OverviewFilters) => ['attendance', 'overview', filters] as const,
  sessions: (moduleId?: number) => ['sessions', moduleId ?? 'active'] as const,
}

/** RF-05 */
export function useMyAttendance() {
  const { attendance } = useDependencies()
  // Se refresca cada 30 s para que el botón se habilite o cierre según el horario de la clase.
  return useQuery({ queryKey: attendanceKeys.mine, queryFn: () => attendance.getMine(), refetchInterval: 30_000 })
}

/** Detalle de un estudiante para el administrador. */
export function useStudentAttendance(studentId: number, moduleId?: number) {
  const { attendance } = useDependencies()
  return useQuery({
    queryKey: attendanceKeys.student(studentId, moduleId),
    queryFn: () => attendance.getStudent(studentId, moduleId),
    enabled: Number.isInteger(studentId) && studentId > 0,
  })
}

/** RF-03 */
export function useMarkAttendance() {
  const { attendance } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code?: string) => attendance.mark(code),
    onSettled: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.mine }),
  })
}

/** RF-08 */
export function useAttendanceOverview(filters: OverviewFilters = {}, options: { refetchInterval?: number; enabled?: boolean } = {}) {
  const { attendance } = useDependencies()
  return useQuery({
    queryKey: attendanceKeys.overview(filters),
    queryFn: () => attendance.getOverview(filters),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useClassSessions(moduleId?: number) {
  const { attendance } = useDependencies()
  return useQuery({ queryKey: attendanceKeys.sessions(moduleId), queryFn: () => attendance.getSessions(moduleId) })
}

/** RF-07 */
export function useUpdateAttendance() {
  const { attendance } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAttendanceInput) => attendance.update(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
      void queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

/** RF-17 */
export function useExportAttendance(moduleId?: number) {
  const { attendance } = useDependencies()
  return useMutation({
    mutationFn: async () => {
      const { blob, fileName } = await attendance.export(moduleId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
      return fileName
    },
  })
}

/** Descarga la constancia de asistencia en PDF (del estudiante indicado o la propia). */
export function useDownloadCertificate() {
  const { attendance } = useDependencies()
  return useMutation({
    mutationFn: async ({ studentId, moduleId }: { studentId?: number; moduleId?: number } = {}) => {
      const { blob, fileName } = await attendance.certificate(studentId, moduleId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return fileName
    },
  })
}
