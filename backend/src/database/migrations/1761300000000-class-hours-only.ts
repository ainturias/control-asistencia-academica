import { MigrationInterface, QueryRunner } from 'typeorm';

/** Regla opcional: sin puntualidad, marcar solo durante el horario de cada clase (no todo el día). */
export class ClassHoursOnly1761300000000 implements MigrationInterface {
  name = 'ClassHoursOnly1761300000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE modules ADD COLUMN class_hours_only BOOLEAN NOT NULL DEFAULT false`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE modules DROP COLUMN class_hours_only`);
  }
}
