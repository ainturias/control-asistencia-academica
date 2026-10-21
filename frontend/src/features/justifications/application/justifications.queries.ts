import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDependencies } from '../../../core/di/dependencies'
import type { EditableStatus } from '../../attendance/domain/attendance'
import type { JustificationFilters } from '../domain/justification'

const keys = {
  mine: ['justifications', 'mine'] as const,
  list: (filters: JustificationFilters) => ['justifications', 'list', filters] as const,
  file: (id: number, fileId: number) => ['justifications', 'file', id, fileId] as const,
}

/** Tras cualquier cambio se refrescan justificaciones, asistencias y actividades. */
function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['justifications'] })
    void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    void queryClient.invalidateQueries({ queryKey: ['activity'] })
  }
}

export function useMyJustifications() {
  const { justifications } = useDependencies()
  return useQuery({ queryKey: keys.mine, queryFn: () => justifications.listMine() })
}

export function useSubmitJustification() {
  const { justifications } = useDependencies()
  const onSuccess = useInvalidate()
  return useMutation({
    mutationFn: (input: { sessionId: number; reason: string; files: File[] }) => justifications.submit(input),
    onSuccess,
  })
}

/** Bandeja del admin; se refresca cada minuto para ver nuevas solicitudes. */
export function useJustifications(filters: JustificationFilters, enabled = true) {
  const { justifications } = useDependencies()
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: () => justifications.list(filters),
    refetchInterval: 30_000,
    enabled,
  })
}

export function useJustificationActions() {
  const { justifications } = useDependencies()
  const onSuccess = useInvalidate()
  return {
    approve: useMutation({
      mutationFn: ({ id, status, comment }: { id: number; status: EditableStatus; comment?: string }) =>
        justifications.approve(id, status, comment),
      onSuccess,
    }),
    reject: useMutation({
      mutationFn: ({ id, comment }: { id: number; comment: string }) => justifications.reject(id, comment),
      onSuccess,
    }),
    createByAdmin: useMutation({
      mutationFn: (input: { studentId: number; sessionId: number; status: EditableStatus; reason: string; files: File[] }) =>
        justifications.createByAdmin(input),
      onSuccess,
    }),
  }
}

/** Las imágenes requieren el token: se descargan y se exponen como data URL. */
export function useJustificationImage(id: number, fileId: number) {
  const { justifications } = useDependencies()
  return useQuery({
    queryKey: keys.file(id, fileId),
    queryFn: async () => {
      const blob = await justifications.getFile(id, fileId)
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
