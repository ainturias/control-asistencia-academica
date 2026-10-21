import { QueryFailedError } from 'typeorm';

/** true si el error es una violación de restricción UNIQUE de PostgreSQL. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === '23505'
  );
}
