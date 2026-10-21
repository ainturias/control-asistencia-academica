import { CalendarDays, Printer } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PageLoader } from '../../../shared/ui/Spinner'
import { useActiveModule } from '../../academic-modules/application/academic-modules.queries'
import { AttendanceRulesCard } from '../../academic-modules/presentation/AttendanceRulesCard'
import { ManageSessionsCard } from '../../class-sessions/presentation/ManageSessionsCard'
import { SessionChangesHistory } from '../../class-sessions/presentation/SessionChangesHistory'
import { useClassSessions } from '../../attendance/application/attendance.queries'
import { useProfile, useProfilePhotoUrl } from '../../profile/application/profile.queries'
import { teacherDisplayName } from '../../profile/domain/profile'
import { calendarSummaryText } from '../domain/calendar'
import { calendarFileName, useCalendarImage } from '../application/use-calendar-image'
import { CalendarShareActions, ModuleCalendarCard } from './ModuleCalendarCard'

export function ModuleCalendarPage() {
  const module = useActiveModule()
  const sessions = useClassSessions()
  const profile = useProfile()
  const photoUrl = useProfilePhotoUrl()
  const image = useCalendarImage(calendarFileName(module.data?.name ?? 'modulo'))

  if (module.isLoading || sessions.isLoading) return <PageLoader />
  if (!module.data || !sessions.data?.length) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title="Todavía no hay un calendario"
          description="Activa un módulo con sus fechas de clase para ver el calendario."
          action={
            <Link to="/admin/nuevo-modulo">
              <Button>Activar un módulo</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  const data = module.data
  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Calendario del módulo"
          description="Fechas de clase, horario y docente del módulo activo."
          actions={
            <>
              <CalendarShareActions
                source={image}
                text={calendarSummaryText({
                  moduleName: data.name,
                  sessions: sessions.data,
                  teacherName: profile.data ? teacherDisplayName(profile.data) : null,
                })}
              />
              <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
                Imprimir
              </Button>
            </>
          }
        />
      </div>

      <ModuleCalendarCard
        moduleName={data.name}
        sessions={sessions.data}
        teacher={profile.data ?? null}
        teacherPhotoUrl={photoUrl}
        cardRef={image.ref}
      />

      <div className="mt-6 space-y-6 print:hidden">
        <div className="grid gap-6 xl:grid-cols-2 *:min-w-0">
          <ManageSessionsCard />
          <SessionChangesHistory moduleName={data.name} />
        </div>
        <AttendanceRulesCard key={JSON.stringify(data.rules)} rules={data.rules} sampleClass={sessions.data[0]} />
      </div>
    </>
  )
}
