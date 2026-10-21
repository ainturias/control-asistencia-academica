import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDependencies } from '../../../core/di/dependencies'
import type { ActivateModuleInput, AttendanceRules, ExtraField, ImportDraft, ImportFiles } from '../domain/academic-module'

export function useActiveModule() {
  const { modules } = useDependencies()
  return useQuery({ queryKey: ['modules', 'active'], queryFn: () => modules.getActive() })
}

/** RF-16 */
export function usePreviewImport() {
  const { modules } = useDependencies()
  return useMutation({ mutationFn: (files: ImportFiles) => modules.preview(files) })
}

/** RF-13: tras activar, todo dato en caché pertenece al módulo anterior. */
export function useActivateModule() {
  const { modules } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ActivateModuleInput) => modules.activate(input),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

/** Cambiar las reglas recalcula estados de hoy en todas las vistas de asistencia. */
export function useUpdateAttendanceRules() {
  const { modules } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rules: AttendanceRules) => modules.updateRules(rules),
    onSuccess: (module) => {
      queryClient.setQueryData(['modules', 'active'], module)
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
      void queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

/** Historial de módulos (activo, programado, finalizados). */
export function useModules() {
  const { modules } = useDependencies()
  return useQuery({ queryKey: ['modules', 'list'], queryFn: () => modules.list() })
}

export function useModule(id: number) {
  const { modules } = useDependencies()
  return useQuery({
    queryKey: ['modules', 'detail', id],
    queryFn: () => modules.get(id),
    enabled: Number.isInteger(id) && id > 0,
  })
}

/** Reprogramar, activar ya o cancelar el módulo programado. Activar cambia todo el módulo en uso. */
export function useScheduledModuleActions() {
  const { modules } = useDependencies()
  const queryClient = useQueryClient()
  const onSuccess = () => queryClient.invalidateQueries()
  return {
    reschedule: useMutation({
      mutationFn: ({ id, scheduledFor }: { id: number; scheduledFor: string }) => modules.reschedule(id, scheduledFor),
      onSuccess,
    }),
    activateNow: useMutation({ mutationFn: (id: number) => modules.activateNow(id), onSuccess }),
    cancel: useMutation({ mutationFn: (id: number) => modules.cancelSchedule(id), onSuccess }),
  }
}

/** Revalida la vista previa editada. */
export function useValidateDraft() {
  const { modules } = useDependencies()
  return useMutation({ mutationFn: (draft: ImportDraft) => modules.validate(draft) })
}

/** Campos adicionales del módulo activo (nombre, visibilidad, agregar o quitar). */
export function useUpdateExtraFields() {
  const { modules } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: ExtraField[]) => modules.updateExtraFields(fields),
    onSuccess: (module) => {
      queryClient.setQueryData(['modules', 'active'], module)
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
      void queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}
