import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDependencies } from '../../../core/di/dependencies'
import type { StudentInput } from '../domain/student'

/** RF-06 */
export function useStudents(search = '', enabled = true, moduleId?: number, includeInactive = false) {
  const { students } = useDependencies()
  return useQuery({
    queryKey: ['students', search, moduleId ?? 'active', includeInactive],
    queryFn: () => students.list(search || undefined, moduleId, includeInactive),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Altas, correcciones y bajas en el módulo activo; refrescan listas, asistencias y actividades. */
export function useStudentMutations() {
  const { students } = useDependencies()
  const queryClient = useQueryClient()
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['students'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    void queryClient.invalidateQueries({ queryKey: ['activity'] })
    void queryClient.invalidateQueries({ queryKey: ['modules'] })
  }
  return {
    create: useMutation({ mutationFn: (input: StudentInput) => students.create(input), onSuccess }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: number; input: StudentInput }) => students.update(id, input),
      onSuccess,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: number; active: boolean }) => students.setActive(id, active),
      onSuccess,
    }),
  }
}
