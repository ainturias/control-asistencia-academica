import type {
  ActivateModuleInput,
  ActiveModule,
  AttendanceRules,
  ExtraField,
  ImportDraft,
  ImportErrors,
  ImportFiles,
  ImportPreview,
  ModuleListItem,
} from './academic-module'

export interface AcademicModuleRepository {
  getActive(): Promise<ActiveModule | null>
  preview(files: ImportFiles): Promise<ImportPreview>
  /** Revalida la vista previa después de editarla a mano. */
  validate(draft: ImportDraft): Promise<{ valid: boolean; errors: ImportErrors }>
  /** Con `scheduledFor` el módulo queda programado en vez de activarse ahora. */
  activate(input: ActivateModuleInput): Promise<ActiveModule>
  updateExtraFields(fields: ExtraField[]): Promise<ActiveModule>
  list(): Promise<ModuleListItem[]>
  get(id: number): Promise<ActiveModule>
  reschedule(id: number, scheduledFor: string): Promise<ActiveModule>
  activateNow(id: number): Promise<ActiveModule>
  cancelSchedule(id: number): Promise<ActiveModule>
  updateRules(rules: AttendanceRules): Promise<ActiveModule>
}
