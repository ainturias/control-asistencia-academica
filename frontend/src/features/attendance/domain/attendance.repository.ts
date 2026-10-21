import type {
  AttendanceOverview,
  AttendanceRecord,
  ClassSession,
  MyAttendance,
  OverviewFilters,
  UpdateAttendanceInput,
} from './attendance'

export interface AttendanceRepository {
  getMine(): Promise<MyAttendance>
  getStudent(studentId: number, moduleId?: number): Promise<MyAttendance>
  mark(code?: string): Promise<AttendanceRecord>
  getOverview(filters: OverviewFilters): Promise<AttendanceOverview>
  getSessions(moduleId?: number): Promise<ClassSession[]>
  update(input: UpdateAttendanceInput): Promise<AttendanceRecord>
  export(moduleId?: number): Promise<{ blob: Blob; fileName: string }>
  /** Constancia en PDF: sin `studentId` es la del propio estudiante. */
  certificate(studentId?: number, moduleId?: number): Promise<{ blob: Blob; fileName: string }>
}
