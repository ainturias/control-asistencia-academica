import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { getErrorMessage } from '../../../core/http/api-error'
import { cn } from '../../../shared/lib/cn'
import { Spinner, PageLoader } from '../../../shared/ui/Spinner'
import { ThemeToggle } from '../../../shared/ui/ThemeToggle'
import { Field, Input } from '../../../shared/ui/Field'
import { useAuth } from '../application/auth-context'
import { homePathFor, type Role } from '../domain/auth-user'

const inputClass = 'h-14! rounded-2xl! pl-11! text-base! sm:text-sm! 2xl:h-16! 2xl:text-base!'

export function LoginPage() {
  const { status, user, expiredReason } = useAuth()
  const [tab, setTab] = useState<Role>('STUDENT')

  if (status === 'loading') return <PageLoader />
  if (user) return <Navigate to={homePathFor(user.role)} replace />

  return (
    <div className="grid min-h-dvh lg:grid-cols-[54fr_46fr]">
      <BrandPanel />

      <main className="relative flex flex-col overflow-hidden px-4 py-6 sm:px-8 lg:px-12 lg:py-10 2xl:px-16 2xl:py-12">
        <div aria-hidden className="absolute top-[12%] -right-32 size-80 rounded-full bg-deco-violet/20 blur-3xl" />

        <div className="relative flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden items-center gap-3 text-sm text-muted sm:flex 2xl:text-base">
              <span className="h-px w-10 bg-muted/40" />
              Sistema de Registro y Control de Asistencia
            </p>
            <ThemeToggle />
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[520px] rounded-[28px] bg-surface p-6 shadow-[0_24px_70px_-24px_rgba(80,70,229,0.28)] ring-1 ring-line/70 sm:p-12 2xl:max-w-[620px] 2xl:rounded-[32px] 2xl:p-14">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl 2xl:text-5xl">¡Bienvenido!</h1>
            <span aria-hidden className="mt-3 block h-1 w-11 rounded-full bg-brand" />
            <p className="mt-5 text-muted 2xl:text-lg">Ingresa para registrar o consultar asistencias.</p>

            {expiredReason && (
              <p className="mt-5 rounded-xl bg-alert-soft px-4 py-3 text-sm font-medium text-alert-ink">
                {expiredReason}
              </p>
            )}

            <div role="tablist" className="mt-8 grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1.5 ring-1 ring-line/60">
              <TabButton
                active={tab === 'STUDENT'}
                onClick={() => setTab('STUDENT')}
                icon={<GraduationCap className="size-4" />}
              >
                Estudiante
              </TabButton>
              <TabButton
                active={tab === 'ADMIN'}
                onClick={() => setTab('ADMIN')}
                icon={<ShieldCheck className="size-4" />}
              >
                Administrador
              </TabButton>
            </div>

            <div className="mt-7 2xl:mt-8">{tab === 'STUDENT' ? <StudentForm /> : <AdminForm />}</div>

          </div>
        </div>

        <p className="relative text-center text-xs text-muted lg:hidden">
          Sistema de Registro y Control de Asistencia · v1.0
        </p>
      </main>
    </div>
  )
}

function StudentForm() {
  const { loginStudent } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const current = await loginStudent(identifier.trim())
      navigate(homePathFor(current.role), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Correo o número de registro" htmlFor="identifier">
        <Input
          id="identifier"
          autoFocus
          required
          autoComplete="username"
          placeholder="juan@gmail.com o 1001"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          icon={<UserRound className="ml-1 size-[18px]" />}
          className={inputClass}
        />
      </Field>
      <FormError message={error} />
      <SubmitButton loading={loading}>Ingresar</SubmitButton>
    </form>
  )
}

function AdminForm() {
  const { loginAdmin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const current = await loginAdmin(email.trim(), password)
      navigate(homePathFor(current.role), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Correo" htmlFor="email">
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="ml-1 size-[18px]" />}
          className={inputClass}
        />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<KeyRound className="ml-1 size-[18px]" />}
          className={inputClass}
        />
      </Field>
      <FormError message={error} />
      <SubmitButton loading={loading}>Ingresar como administrador</SubmitButton>
    </form>
  )
}

function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative flex h-14 w-full items-center justify-center rounded-2xl bg-brand px-12 font-semibold 2xl:h-16 2xl:text-lg text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Spinner className="size-5" /> : children}
      {!loading && <ArrowRight className="absolute right-5 size-5 transition-transform group-hover:translate-x-1" />}
    </button>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-alert-soft px-4 py-3 text-sm font-medium text-alert-ink">
      {message}
    </p>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition 2xl:h-14 2xl:text-base',
        active ? 'bg-surface text-brand shadow-sm ring-1 ring-line/60' : 'text-muted hover:text-ink',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'grid size-11 place-items-center rounded-xl 2xl:size-13',
          inverted ? 'bg-white/15 text-white ring-1 ring-white/20' : 'bg-brand text-white',
        )}
      >
        <CalendarCheck2 className="size-5" />
      </div>
      <span className={cn('text-lg font-bold 2xl:text-xl', inverted ? 'text-white' : 'text-ink')}>Asistencia</span>
    </div>
  )
}

const features = [
  {
    icon: CalendarDays,
    title: 'Registro rápido',
    text: 'Marca tu asistencia en segundos.',
  },
  {
    icon: ChartNoAxesColumn,
    title: 'Historial completo',
    text: 'Consulta tus registros fácilmente.',
  },
  {
    icon: ShieldCheck,
    title: 'Información segura',
    text: 'Tus datos siempre protegidos.',
  },
]

function BrandPanel() {
  return (
    <aside className="relative z-10 hidden bg-linear-to-br from-brand via-brand to-[#5b5cf0] p-12 text-white lg:flex lg:flex-col xl:p-14 2xl:p-16">
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-6 size-[340px] rounded-full bg-linear-to-br from-deco-violet to-[#7a72f5]/80" />
        <div className="absolute -right-24 -bottom-32 size-[420px] rounded-full bg-sky-400/30 blur-3xl" />
      </div>

      <div className="relative">
        <Logo inverted />
      </div>

      <div className="relative my-auto flex items-center gap-4 py-10">
        <div className="max-w-sm shrink-0 xl:max-w-[330px] 2xl:max-w-[390px]">
          <h2 className="text-5xl leading-[1.08] font-bold tracking-tight 2xl:text-6xl">
            Registra tu asistencia en <span className="text-[#c9c5ff]">un clic.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/85 2xl:mt-6 2xl:text-xl">
            Marca el día de tu clase, revisa tu historial y mantén tu récord al día.
          </p>

          <ul className="mt-10 space-y-5 2xl:mt-12 2xl:space-y-6">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-5">
                <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15 2xl:size-15">
                  <Icon className="size-6" />
                </span>
                <span>
                  <span className="block font-semibold 2xl:text-lg">{title}</span>
                  <span className="block text-sm text-white/75 2xl:text-base">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Illustration />
      </div>

      <p className="relative text-sm text-white/75 2xl:text-base">
        Sistema de Registro y Control de Asistencia <span className="mx-2">·</span> v1.0
      </p>
    </aside>
  )
}

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Medidas de la caja donde se dibuja la ilustración antes de escalarla. */
const ILLUSTRATION_WIDTH = 540
const ILLUSTRATION_HEIGHT = 600
const ILLUSTRATION_MAX_SCALE = 1.15

/** Ilustración decorativa: calendario del mes actual y tarjeta de resumen. */
function Illustration() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array<null>(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const monthName = today.toLocaleDateString('es', { month: 'long' })
  const title = `${monthName[0].toUpperCase()}${monthName.slice(1)} ${year}`

  // Se dibuja en una caja fija y se escala al ancho disponible; puede asomarse un poco fuera del panel.
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(ILLUSTRATION_MAX_SCALE, entry.contentRect.width / ILLUSTRATION_WIDTH))
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={boxRef}
      aria-hidden
      className={cn('relative hidden min-w-0 flex-1 xl:-mr-20 xl:block 2xl:-mr-24', scale < 0.55 && 'invisible')}
      style={{ height: ILLUSTRATION_HEIGHT * scale }}
    >
      <div
        className="absolute top-0 right-0 origin-top-right"
        style={{ width: ILLUSTRATION_WIDTH, height: ILLUSTRATION_HEIGHT, transform: `scale(${scale})` }}
      >
        <div className="absolute top-10 left-16 size-[450px] rounded-full border-2 border-dashed border-white/50" />
        <div className="absolute top-0 left-[317px] grid size-[84px] place-items-center rounded-full bg-white text-brand shadow-xl shadow-brand-ink/30">
          <GraduationCap className="size-9" />
        </div>
        <div className="absolute top-[400px] left-0 size-[145px] rounded-full bg-linear-to-br from-[#ff9a4d] to-[#f2762e]" />
        <div className="absolute top-[487px] left-[311px] size-[102px] rounded-full bg-deco-teal" />

        <div className="absolute top-[175px] left-[298px] w-[232px] rotate-[5deg] rounded-3xl bg-white/95 py-6 pr-6 pl-12 text-ink shadow-2xl shadow-brand-ink/30">
          <p className="font-semibold">Mi asistencia</p>
          <div className="mt-5 flex h-24 items-end justify-center gap-4 rounded-2xl bg-brand-soft/60 pb-4">
            {[35, 55, 75, 40].map((h, i) => (
              <span key={i} className="w-3 rounded-full bg-deco-violet/70" style={{ height: `${h}%` }} />
            ))}
          </div>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              { label: 'Asistencias', value: 18, color: 'bg-deco-teal' },
              { label: 'Tardanzas', value: 2, color: 'bg-amber-400' },
              { label: 'Faltas', value: 1, color: 'bg-alert' },
            ].map(({ label, value, color }) => (
              <li key={label} className="flex items-center gap-2.5">
                <span className={cn('size-2.5 rounded-full', color)} />
                <span className="flex-1">{label}</span>
                <span className="font-semibold">{value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute top-[100px] left-3 h-[365px] w-[290px] -rotate-[6deg] rounded-3xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm" />
        <div className="absolute top-[110px] left-10 w-[290px] -rotate-[6deg] rounded-3xl bg-white p-5 text-ink shadow-2xl shadow-brand-ink/40">
          <div className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5">
            <p className="text-sm font-semibold">{title}</p>
            <div className="flex gap-2 text-ink/70">
              <ChevronLeft className="size-4" />
              <ChevronRight className="size-4" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-y-2 text-center text-xs">
            {weekdays.map((d, i) => (
              <span key={i} className="font-medium text-muted">
                {d}
              </span>
            ))}
            {cells.map((day, i) => (
              <span
                key={i}
                className={cn(
                  'mx-auto grid size-8 place-items-center rounded-full text-ink/70',
                  day === today.getDate() && 'bg-brand font-semibold text-white shadow-md shadow-brand/40',
                )}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
