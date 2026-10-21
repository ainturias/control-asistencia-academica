import { http } from '../../../core/http/http-client'
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
} from '../domain/academic-module'
import type { AcademicModuleRepository } from '../domain/academic-module.repository'

function toFormData(files: ImportFiles) {
  const form = new FormData()
  form.append('students', files.students)
  form.append('sessions', files.sessions)
  return form
}

export class HttpAcademicModuleRepository implements AcademicModuleRepository {
  async getActive() {
    const { data } = await http.get<{ module: ActiveModule | null }>('/modules/active')
    return data.module
  }

  async preview(files: ImportFiles) {
    const { data } = await http.post<ImportPreview>('/modules/preview', toFormData(files))
    return data
  }

  async validate(draft: ImportDraft) {
    const { data } = await http.post<{ valid: boolean; errors: ImportErrors }>('/modules/validate', draft)
    return data
  }

  async activate({ name, draft, extraFields, scheduledFor }: ActivateModuleInput) {
    const { data } = await http.post<{ module: ActiveModule }>('/modules/activate', {
      name,
      confirm: true,
      scheduledFor,
      students: draft.students,
      sessions: draft.sessions,
      extraFields,
    })
    return data.module
  }

  async updateExtraFields(fields: ExtraField[]) {
    const { data } = await http.patch<{ module: ActiveModule }>('/modules/active/extra-fields', { fields })
    return data.module
  }

  async list() {
    const { data } = await http.get<ModuleListItem[]>('/modules')
    return data
  }

  async get(id: number) {
    const { data } = await http.get<{ module: ActiveModule }>(`/modules/${id}`)
    return data.module
  }

  async reschedule(id: number, scheduledFor: string) {
    const { data } = await http.patch<{ module: ActiveModule }>(`/modules/${id}/schedule`, { scheduledFor })
    return data.module
  }

  async activateNow(id: number) {
    const { data } = await http.post<{ module: ActiveModule }>(`/modules/${id}/activate-now`)
    return data.module
  }

  async cancelSchedule(id: number) {
    const { data } = await http.delete<{ module: ActiveModule }>(`/modules/${id}/schedule`)
    return data.module
  }

  async updateRules(rules: AttendanceRules) {
    const { data } = await http.patch<{ module: ActiveModule }>('/modules/active/rules', rules)
    return data.module
  }
}
