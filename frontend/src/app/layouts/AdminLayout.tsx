import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileClock,
  History,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Search,
  SquarePlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useActiveModule } from '../../features/academic-modules/application/academic-modules.queries'
import { useAuth } from '../../features/auth/application/auth-context'
import { useJustifications } from '../../features/justifications/application/justifications.queries'
import { CommandPalette } from '../../features/dashboard/presentation/CommandPalette'
import { NotificationsMenu } from '../../features/dashboard/presentation/NotificationsMenu'
import { useProfile } from '../../features/profile/application/profile.queries'
import { teacherDisplayName } from '../../features/profile/domain/profile'
import { TeacherAvatar } from '../../features/profile/presentation/TeacherAvatar'
import { cn } from '../../shared/lib/cn'
import { AppBackground } from '../../shared/ui/AppBackground'
import { ThemeToggle } from '../../shared/ui/ThemeToggle'

const COLLAPSED_KEY = 'admin.sidebarCollapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

const NAV = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/asistencias', label: 'Asistencias', icon: ClipboardList },
  { to: '/admin/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/admin/estudiantes', label: 'Estudiantes', icon: Users },
  { to: '/admin/justificaciones', label: 'Justificaciones', icon: FileClock },
  { to: '/admin/actividades', label: 'Actividades', icon: History },
  { to: '/admin/modulos', label: 'Módulos', icon: Library },
  { to: '/admin/nuevo-modulo', label: 'Nuevo módulo', icon: SquarePlus },
  { to: '/admin/perfil', label: 'Mi perfil', icon: UserRound },
]

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  // En escritorio el menú se contrae a una barra de íconos; la preferencia se recuerda.
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const compact = collapsed ? 'lg:hidden' : ''

  const toggleMenu = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      const next = !collapsed
      setCollapsed(next)
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // Sin almacenamiento solo se pierde la preferencia.
      }
    } else {
      setMenuOpen(true)
    }
  }
  const [searchOpen, setSearchOpen] = useState(false)
  const hasModule = !!useActiveModule().data
  const pendingJustifications = useJustifications({ status: 'PENDING' }, hasModule).data?.pending ?? 0
  const { pathname } = useLocation()

  // Ctrl+K / ⌘K abre la búsqueda desde cualquier página.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Cierra el menú móvil al navegar.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMenuOpen(false)
  }

  return (
    <div
      className={cn(
        'relative min-h-screen transition-[padding] duration-300 print:pl-0',
        collapsed ? 'lg:pl-20' : 'lg:pl-72',
      )}
    >
      <AppBackground />

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-line/70 bg-surface/90 backdrop-blur-xl transition-[transform,width] duration-300 lg:translate-x-0 print:hidden',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lg:w-20',
        )}
      >
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-brand-soft/70" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 left-24 size-40 rounded-full bg-deco-violet/10" />

        <div className={cn('relative flex items-center justify-between px-6 pt-7 pb-6', collapsed && 'lg:justify-center lg:px-0')}>
          <Brand compact={compact} />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        <ActiveModuleCard collapsed={collapsed} />

        <nav className={cn('relative flex-1 space-y-1 overflow-y-auto px-4 py-6', collapsed && 'lg:px-3')}>
          {NAV.map(({ to, label, icon: Icon, end }) => {
            const badge = to === '/admin/justificaciones' ? pendingJustifications : 0
            return (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-semibold transition',
                  collapsed && 'lg:justify-center lg:px-0',
                  isActive
                    ? 'bg-brand-soft text-brand-ink before:absolute before:inset-y-2 before:-left-1 before:w-1 before:rounded-full before:bg-brand'
                    : 'text-ink/75 hover:bg-canvas hover:text-ink',
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              <span className={cn('truncate', compact)}>{label}</span>
              {badge > 0 && (
                <span
                  className={cn(
                    'ml-auto rounded-full bg-alert px-1.5 text-[11px] font-bold text-white',
                    collapsed && 'lg:absolute lg:top-1 lg:right-2 lg:ml-0',
                  )}
                  title={`${badge} por revisar`}
                >
                  {badge}
                </span>
              )}
            </NavLink>
            )
          })}
        </nav>

        <UserCard collapsed={collapsed} />
      </aside>

      <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/80 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-18 max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={toggleMenu}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-ink shadow-sm ring-1 ring-line transition hover:ring-brand/30"
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <Menu className="size-5" />
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl bg-surface px-4 text-left text-sm text-muted shadow-sm ring-1 ring-line transition hover:ring-brand/30 sm:max-w-xl"
          >
            <Search className="size-[18px] shrink-0" />
            <span className="truncate">Buscar estudiantes, páginas…</span>
            <kbd className="ml-auto hidden rounded-lg border border-line px-2 py-0.5 font-sans text-xs font-semibold text-muted sm:block">
              Ctrl + K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationsMenu />
            <HeaderAvatar />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8 print:max-w-none print:p-8">
        <Outlet />
      </main>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

function Brand({ compact }: { compact: string }) {
  return (
    <Link to="/admin" className="flex items-center gap-3">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
        <CalendarCheck2 className="size-6" />
      </div>
      <div className={cn('leading-tight', compact)}>
        <p className="text-lg font-extrabold">Asistencia</p>
        <p className="text-xs text-muted">Registro y control</p>
      </div>
    </Link>
  )
}

function ActiveModuleCard({ collapsed }: { collapsed: boolean }) {
  const { data, isLoading } = useActiveModule()
  const name = isLoading ? '…' : (data?.name ?? 'Ninguno')
  const compact = collapsed ? 'lg:hidden' : ''
  return (
    <div className={cn('relative px-6', collapsed && 'lg:px-3')}>
      <p className={cn('mb-2 text-xs font-bold tracking-wide text-teal uppercase', compact)}>Módulo activo</p>
      <Link
        to={data ? '/admin/calendario' : '/admin/nuevo-modulo'}
        title={collapsed ? `Módulo activo: ${name}` : undefined}
        className={cn(
          'flex items-center gap-3 rounded-2xl bg-teal-soft px-4 py-3 text-teal-ink transition hover:brightness-95',
          collapsed && 'lg:justify-center lg:px-0',
        )}
      >
        <span className={cn('size-2.5 shrink-0 rounded-full', data ? 'bg-teal' : 'bg-muted/50')} />
        <span className={cn('min-w-0 flex-1 truncate font-bold', compact)}>{name}</span>
        <ChevronRight className={cn('size-4 shrink-0', compact)} />
      </Link>
    </div>
  )
}

function UserCard({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth()
  const { data: profile } = useProfile()
  const name = profile ? teacherDisplayName(profile) : (user?.name ?? '')
  return (
    <div className={cn('relative p-4', collapsed && 'lg:px-2')}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line',
          collapsed && 'lg:flex-col lg:gap-2 lg:px-1',
        )}
      >
        <Link to="/admin/perfil" className="flex min-w-0 flex-1 items-center gap-3" title="Mi perfil">
          <TeacherAvatar name={profile?.fullName ?? name} className="size-11 text-sm" />
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <p className="truncate text-sm font-bold">{name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg p-2 text-muted hover:bg-alert-soft hover:text-alert-ink"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </div>
  )
}

function HeaderAvatar() {
  const { data: profile } = useProfile()
  return (
    <Link to="/admin/perfil" className="rounded-full ring-2 ring-surface transition hover:ring-brand/30" title="Mi perfil">
      <TeacherAvatar name={profile?.fullName ?? 'A'} className="size-11 text-sm" />
    </Link>
  )
}
