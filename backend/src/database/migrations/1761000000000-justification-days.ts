import { MigrationInterface, QueryRunner } from 'typeorm';

/** Plazo (en días) para que el estudiante justifique una falta o un atraso; configurable por módulo. */
export class JustificationDays1761000000000 implements MigrationInterface {
  name = 'JustificationDays1761000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE modules ADD COLUMN justification_days INT NOT NULL DEFAULT 3`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE modules DROP COLUMN justification_days`);
  }
}
