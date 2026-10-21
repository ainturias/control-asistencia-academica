import { MigrationInterface, QueryRunner } from 'typeorm';

/** Campos adicionales de estudiantes (columnas extra del Excel) y baja de estudiantes sin borrarlos. */
export class StudentEditingExtraFields1760800000000 implements MigrationInterface {
  name = 'StudentEditingExtraFields1760800000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE students
        ADD COLUMN extra  JSONB   NOT NULL DEFAULT '{}',
        ADD COLUMN active BOOLEAN NOT NULL DEFAULT true`);
    // Definición de los campos adicionales del módulo: [{ key, label, visibleToStudent }].
    await q.query(`ALTER TABLE modules ADD COLUMN extra_fields JSONB NOT NULL DEFAULT '[]'`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE modules DROP COLUMN extra_fields`);
    await q.query(`ALTER TABLE students DROP COLUMN extra, DROP COLUMN active`);
  }
}
