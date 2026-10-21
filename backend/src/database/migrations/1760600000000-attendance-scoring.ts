import { MigrationInterface, QueryRunner } from 'typeorm';

/** Puntos por estado y porcentaje mínimo de asistencia por módulo. */
export class AttendanceScoring1760600000000 implements MigrationInterface {
  name = 'AttendanceScoring1760600000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE modules
        ADD COLUMN present_points            INT NOT NULL DEFAULT 2,
        ADD COLUMN late_points               INT NOT NULL DEFAULT 1,
        ADD COLUMN min_attendance_percentage INT NOT NULL DEFAULT 80`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE modules
        DROP COLUMN present_points, DROP COLUMN late_points, DROP COLUMN min_attendance_percentage`);
  }
}
