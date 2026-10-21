import { createBrowserRouter, Navigate } from 'react-router'
import { NewModulePage } from '../features/academic-modules/presentation/NewModulePage'
import { ActivityPage } from '../features/activity/presentation/ActivityPage'
import { ModuleCalendarPage } from '../features/calendar/presentation/ModuleCalendarPage'
import { AttendanceOverviewPage } from '../features/attendance/presentation/AttendanceOverviewPage'
import { StudentAttendancePage } from '../features/attendance/presentation/StudentAttendancePage'
import { StudentDashboardPage } from '../features/attendance/presentation/StudentDashboardPage'
import { LoginPage } from '../features/auth/presentation/LoginPage'
import { HomeRedirect, RequireRole } from '../features/auth/presentation/RequireRole'
import { AdminHomePage } from '../features/dashboard/presentation/AdminHomePage'
import { JustificationsPage } from '../features/justifications/presentation/JustificationsPage'
import { ReportsPage } from '../features/reports/presentation/ReportsPage'
import { ModuleDetailPage } from '../features/module-history/presentation/ModuleDetailPage'
import { ModulesPage } from '../features/module-history/presentation/ModulesPage'
import { ProfilePage } from '../features/profile/presentation/ProfilePage'
import { StudentModulePage } from '../features/student-portal/presentation/StudentModulePage'
import { StudentProfilePage } from '../features/student-portal/presentation/StudentProfilePage'
import { StudentsPage } from '../features/students/presentation/StudentsPage'
import { AdminLayout } from './layouts/AdminLayout'
import { StudentLayout } from './layouts/StudentLayout'

export const router = createBrowserRouter([
  { path: '/', element: <HomeRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireRole role="STUDENT" />,
    children: [
      {
        path: '/estudiante',
        element: <StudentLayout />,
        children: [
          { index: true, element: <StudentDashboardPage /> },
          { path: 'modulo', element: <StudentModulePage /> },
          { path: 'perfil', element: <StudentProfilePage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="ADMIN" />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminHomePage /> },
          { path: 'asistencias', element: <AttendanceOverviewPage /> },
          { path: 'calendario', element: <ModuleCalendarPage /> },
          { path: 'estudiantes', element: <StudentsPage /> },
          { path: 'justificaciones', element: <JustificationsPage /> },
          { path: 'reportes', element: <ReportsPage /> },
          { path: 'estudiantes/:studentId', element: <StudentAttendancePage /> },
          { path: 'actividades', element: <ActivityPage /> },
          { path: 'nuevo-modulo', element: <NewModulePage /> },
          { path: 'modulos', element: <ModulesPage /> },
          { path: 'modulos/:moduleId', element: <ModuleDetailPage /> },
          { path: 'modulos/:moduleId/estudiantes/:studentId', element: <StudentAttendancePage /> },
          { path: 'perfil', element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
