import type { Student, StudentInput } from './student'

export interface StudentRepository {
  list(search?: string, moduleId?: number, includeInactive?: boolean): Promise<Student[]>
  create(input: StudentInput): Promise<Student>
  update(id: number, input: StudentInput): Promise<Student>
  setActive(id: number, active: boolean): Promise<Student>
}
