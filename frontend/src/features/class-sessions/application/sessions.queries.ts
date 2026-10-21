import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDependencies } from '../../../core/di/dependencies'
import type { SessionInput } from '../domain/session-change'
import type { ChangeRequest } from '../domain/session.repository'

/** Cambiar una clase afecta calendario, asistencias, resúmenes y actividades. */
function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

export function useSessionChanges(moduleId?: number, enabled = true) {
  const { sessions } = useDependencies()
  return useQuery({
    queryKey: ['sessions', 'changes', moduleId ?? 'active'],
    queryFn: () => sessions.listChanges(moduleId),
    enabled,
  })
}

export function useSessionActions() {
  const { sessions } = useDependencies()
  const onSuccess = useInvalidateAll()
  return {
    cancel: useMutation({
      mutationFn: ({ id, request }: { id: number; request: ChangeRequest }) => sessions.cancel(id, request),
      onSuccess,
    }),
    restore: useMutation({
      mutationFn: ({ id, request }: { id: number; request: ChangeRequest }) => sessions.restore(id, request),
      onSuccess,
    }),
    reschedule: useMutation({
      mutationFn: ({ id, data, request }: { id: number; data: SessionInput; request: ChangeRequest }) =>
        sessions.reschedule(id, data, request),
      onSuccess,
    }),
    add: useMutation({
      mutationFn: ({ data, request }: { data: SessionInput; request: ChangeRequest }) => sessions.add(data, request),
      onSuccess,
    }),
  }
}

/** Publicar o quitar el código de una clase. */
export function useSetClassCode() {
  const { sessions } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, code }: { id: number; code: string | null }) => sessions.setCode(id, code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

/** Las fotos requieren el token: se descargan y se exponen como data URL. */
export function useChangePhoto(changeId: number, fileId: number) {
  const { sessions } = useDependencies()
  return useQuery({
    queryKey: ['sessions', 'change-file', changeId, fileId],
    queryFn: async () => {
      const blob = await sessions.getChangeFile(changeId, fileId)
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
    },
    staleTime: Infinity,
    // Las imágenes no cambian: no se vuelven a descargar periódicamente ni con cada aviso en tiempo real.
    refetchInterval: false,
    meta: { image: true },
  })
}
