import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDependencies } from '../../../core/di/dependencies'
import type { ProfileChanges, TeacherProfile } from '../domain/profile'

const profileKeys = {
  profile: ['profile'] as const,
  photo: ['profile', 'photo'] as const,
  teacher: (moduleId?: number) => ['teacher', moduleId ?? 'active'] as const,
  teacherPhoto: (moduleId?: number) => ['teacher', 'photo', moduleId ?? 'active'] as const,
}

export function useProfile() {
  const { profile } = useDependencies()
  return useQuery({ queryKey: profileKeys.profile, queryFn: () => profile.get() })
}

/** La foto requiere el token, así que se descarga y se expone como data URL. */
export function useProfilePhotoUrl(): string | null {
  const { profile } = useDependencies()
  const { data: current } = useProfile()
  const { data: url } = useQuery({
    queryKey: profileKeys.photo,
    queryFn: async () => toDataUrl(await profile.getPhoto()),
    enabled: current?.hasPhoto === true,
    staleTime: Infinity,
    // Las imágenes no cambian: no se vuelven a descargar periódicamente ni con cada aviso en tiempo real.
    refetchInterval: false,
    meta: { image: true },
  })
  return current?.hasPhoto ? (url ?? null) : null
}

/** Docente del módulo activo (vista del estudiante). */
export function useTeacher(moduleId?: number) {
  const { profile } = useDependencies()
  return useQuery({ queryKey: profileKeys.teacher(moduleId), queryFn: () => profile.getTeacher(moduleId) })
}

export function useTeacherPhotoUrl(moduleId?: number): string | null {
  const { profile } = useDependencies()
  const { data: teacher } = useTeacher(moduleId)
  const { data: url } = useQuery({
    queryKey: profileKeys.teacherPhoto(moduleId),
    queryFn: async () => toDataUrl(await profile.getTeacherPhoto(moduleId)),
    enabled: teacher?.hasPhoto === true,
    staleTime: Infinity,
    // Las imágenes no cambian: no se vuelven a descargar periódicamente ni con cada aviso en tiempo real.
    refetchInterval: false,
    meta: { image: true },
  })
  return teacher?.hasPhoto ? (url ?? null) : null
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function useProfileMutation<T>(mutationFn: (input: T) => Promise<TeacherProfile>, photoChanged = false) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (updated) => {
      queryClient.setQueryData(profileKeys.profile, updated)
      // El docente también se muestra en calendarios e historial de módulos.
      void queryClient.invalidateQueries({ queryKey: ['teacher'] })
      if (photoChanged) void queryClient.invalidateQueries({ queryKey: profileKeys.photo })
    },
  })
}

export function useUpdateProfile() {
  const { profile } = useDependencies()
  return useProfileMutation((changes: ProfileChanges) => profile.update(changes))
}

export function useUploadPhoto() {
  const { profile } = useDependencies()
  return useProfileMutation((file: File) => profile.uploadPhoto(file), true)
}

export function useRemovePhoto() {
  const { profile } = useDependencies()
  return useProfileMutation(() => profile.removePhoto(), true)
}

export function useChangePassword() {
  const { profile } = useDependencies()
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      profile.changePassword(currentPassword, newPassword),
  })
}
