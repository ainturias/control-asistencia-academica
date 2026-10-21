import { BookOpen, CalendarCheck2, House, LogOut, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../../features/auth/application/auth-context'
import { NotificationBell } from '../../features/notifications/presentation/NotificationBell'
import { cn } from '../../shared/lib/cn'
import { AppBackground } from '../../shared/ui/AppBackground'
import { ThemeToggle } from '../../shared/ui/ThemeToggle'
import { Button } from '../../shared/ui/Button'

const NAV = [
  { to: '/estudiante', label: 'Inicio', icon: House, end: true },
  { to: '/estudiante/modulo', label: 'Módulo', icon: BookOpen },
  { to: '/estudiante/perfil', label: 'Mi perfil', icon: UserRound },
]

export function StudentLayout() {
  const { user, logout } = useAuth()
  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <header className="sticky top-0 z-30 border-b border-line/60 bg-surface/70 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-brand text-white shadow-lg shadow-brand/30">
              <CalendarCheck2 className="size-5" />
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="font-extrabold">Asistencia</p>
              <p className="text-xs text-muted">Registro y control</p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <NavItems />
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm font-medium text-muted sm:block">{user?.name}</span>
            <ThemeToggle className="size-10" />
            <NotificationBell className="size-10" />
            <Button variant="ghost" size="sm" icon={<LogOut className="size-4" />} onClick={() => void logout()}>
              Salir
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 md:hidden">
          <NavItems />
        </nav>
      </header>
      <main className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 print:max-w-none print:p-8">
        <Outlet />
      </main>
    </div>
  )
}

function NavItems() {
  return NAV.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
          isActive ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-canvas hover:text-ink',
        )
      }
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  ))
}
