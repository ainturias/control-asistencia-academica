import { createContext, useContext, type ReactNode } from 'react'
import type { AcademicModuleRepository } from '../../features/academic-modules/domain/academic-module.repository'
import type { ActivityRepository } from '../../features/activity/domain/activity.repository'
import type { AttendanceRepository } from '../../features/attendance/domain/attendance.repository'
import type { AuthRepository } from '../../features/auth/domain/auth.repository'
import type { SessionRepository } from '../../features/class-sessions/domain/session.repository'
import type { NotificationRepository } from '../../features/notifications/domain/notification.repository'
import type { JustificationRepository } from '../../features/justifications/domain/justification.repository'
import type { ProfileRepository } from '../../features/profile/domain/profile.repository'
import type { StudentRepository } from '../../features/students/domain/student.repository'

/** Puertos que la capa de aplicación necesita; las implementaciones se inyectan en app/. */
export interface Dependencies {
  auth: AuthRepository
  attendance: AttendanceRepository
  students: StudentRepository
  activity: ActivityRepository
  modules: AcademicModuleRepository
  profile: ProfileRepository
  justifications: JustificationRepository
  sessions: SessionRepository
  notifications: NotificationRepository
}

const DependenciesContext = createContext<Dependencies | null>(null)

export function DependenciesProvider({
  value,
  children,
}: {
  value: Dependencies
  children: ReactNode
}) {
  return <DependenciesContext.Provider value={value}>{children}</DependenciesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDependencies(): Dependencies {
  const context = useContext(DependenciesContext)
  if (!context) throw new Error('useDependencies debe usarse dentro de DependenciesProvider')
  return context
}
