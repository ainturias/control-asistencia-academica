import { Briefcase, Camera, GraduationCap, Mail, Phone, Save, Trash2, UserRound } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../core/http/api-error'
import { Button } from '../../../shared/ui/Button'
import { Card, CardHeader } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Field, Input } from '../../../shared/ui/Field'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageLoader } from '../../../shared/ui/Spinner'
import { useToast } from '../../../shared/ui/toast'
import { useProfile, useRemovePhoto, useUpdateProfile, useUploadPhoto } from '../application/profile.queries'
import { teacherDisplayName, type TeacherProfile } from '../domain/profile'
import { ChangePasswordCard } from './ChangePasswordCard'
import { TeacherAvatar } from './TeacherAvatar'

/** Datos del docente (el administrador) que se muestran en el calendario del módulo. */
export function ProfilePage() {
  const { data, isLoading, error } = useProfile()

  if (isLoading) return <PageLoader />
  if (error || !data) {
    return (
      <Card>
        <EmptyState icon={<UserRound className="size-6" />} title="No pudimos cargar tu perfil" description={getErrorMessage(error)} />
      </Card>
    )
  }

  return (
    <>
      <PageHeader title="Mi perfil" description="Tus datos como docente del módulo. Aparecen en el calendario de clases." />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <PhotoCard profile={data} />
        <div className="space-y-5">
          <ProfileForm key={data.id} profile={data} />
          <ChangePasswordCard />
        </div>
      </div>
    </>
  )
}

function PhotoCard({ profile }: { profile: TeacherProfile }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadPhoto()
  const remove = useRemovePhoto()
  const toast = useToast()

  const onFile = (file: File | undefined) => {
    if (!file) return
    upload.mutate(file, {
      onSuccess: () => toast.success('Foto actualizada'),
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const onRemove = () =>
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Foto eliminada'),
      onError: (err) => toast.error(getErrorMessage(err)),
    })

  return (
    <Card className="relative h-fit overflow-hidden">
      <div aria-hidden className="h-24 bg-linear-to-br from-brand to-deco-violet" />
      <div className="-mt-14 flex flex-col items-center px-6 pb-6 text-center">
        <TeacherAvatar name={profile.fullName} className="size-28 text-3xl ring-4 ring-surface" />
        <p className="mt-3 text-lg font-extrabold">{teacherDisplayName(profile)}</p>
        <p className="text-sm text-muted">{profile.specialty ?? 'Docente del módulo'}</p>

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <div className="mt-5 flex w-full flex-col gap-2">
          <Button
            variant="secondary"
            icon={<Camera className="size-4" />}
            loading={upload.isPending}
            onClick={() => input.current?.click()}
          >
            {profile.hasPhoto ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          {profile.hasPhoto && (
            <Button variant="ghost" icon={<Trash2 className="size-4" />} loading={remove.isPending} onClick={onRemove}>
              Quitar foto
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">JPG, PNG o WEBP de hasta 2 MB.</p>
      </div>
    </Card>
  )
}

function ProfileForm({ profile }: { profile: TeacherProfile }) {
  const update = useUpdateProfile()
  const toast = useToast()
  const [form, setForm] = useState({
    fullName: profile.fullName,
    title: profile.title ?? '',
    specialty: profile.specialty ?? '',
    phone: profile.phone ?? '',
    bio: profile.bio ?? '',
  })
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    update.mutate(
      {
        fullName: form.fullName,
        title: form.title || null,
        specialty: form.specialty || null,
        phone: form.phone || null,
        bio: form.bio || null,
      },
      {
        onSuccess: () => toast.success('Perfil actualizado'),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  return (
    <Card>
      <CardHeader title="Datos del docente" description="El correo es tu usuario de ingreso y no se puede cambiar aquí." />
      <form onSubmit={submit} className="grid gap-5 p-5 sm:grid-cols-2">
        <Field label="Grado académico" htmlFor="title" hint="Ej.: MSc., Ing., Lic., PhD.">
          <Input
            id="title"
            maxLength={60}
            placeholder="MSc."
            value={form.title}
            onChange={(e) => set('title')(e.target.value)}
            icon={<GraduationCap className="size-4" />}
          />
        </Field>
        <Field label="Nombre completo" htmlFor="fullName">
          <Input
            id="fullName"
            required
            maxLength={150}
            value={form.fullName}
            onChange={(e) => set('fullName')(e.target.value)}
            icon={<UserRound className="size-4" />}
          />
        </Field>
        <Field label="Especialidad o área" htmlFor="specialty">
          <Input
            id="specialty"
            maxLength={150}
            placeholder="Infraestructura como código"
            value={form.specialty}
            onChange={(e) => set('specialty')(e.target.value)}
            icon={<Briefcase className="size-4" />}
          />
        </Field>
        <Field label="Teléfono" htmlFor="phone">
          <Input
            id="phone"
            type="tel"
            maxLength={30}
            placeholder="+591 7xxxxxxx"
            value={form.phone}
            onChange={(e) => set('phone')(e.target.value)}
            icon={<Phone className="size-4" />}
          />
        </Field>
        <Field label="Correo" htmlFor="email">
          <Input id="email" value={profile.email} readOnly disabled icon={<Mail className="size-4" />} className="opacity-70" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Sobre mí" htmlFor="bio" hint="Una breve presentación para tus estudiantes (opcional).">
            <textarea
              id="bio"
              rows={4}
              maxLength={1000}
              value={form.bio}
              onChange={(e) => set('bio')(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
            />
          </Field>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" icon={<Save className="size-4" />} loading={update.isPending}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  )
}
