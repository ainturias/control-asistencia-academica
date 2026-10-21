import { MigrationInterface, QueryRunner } from 'typeorm';

/** Reglas de puntualidad por módulo, estados Atraso/Justificado y perfil del docente. */
export class AttendanceRulesAndProfile1760500000000 implements MigrationInterface {
  name = 'AttendanceRulesAndProfile1760500000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE modules
        ADD COLUMN late_rules_enabled  BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN open_before_minutes INT     NOT NULL DEFAULT 15,
        ADD COLUMN tolerance_minutes   INT     NOT NULL DEFAULT 20,
        ADD COLUMN late_limit_minutes  INT     NOT NULL DEFAULT 60`);

    await q.query(`ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_status_check`);
    await q.query(`ALTER TABLE attendances ALTER COLUMN status TYPE VARCHAR(12)`);
    await q.query(`
      ALTER TABLE attendances ADD CONSTRAINT attendances_status_check
        CHECK (status IN ('PRESENTE', 'ATRASO', 'FALTA', 'JUSTIFICADO'))`);

    await q.query(`
      ALTER TABLE admins
        ADD COLUMN title      VARCHAR(60),
        ADD COLUMN phone      VARCHAR(30),
        ADD COLUMN specialty  VARCHAR(150),
        ADD COLUMN bio        TEXT,
        ADD COLUMN photo      BYTEA,
        ADD COLUMN photo_mime VARCHAR(40)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE admins
        DROP COLUMN title, DROP COLUMN phone, DROP COLUMN specialty,
        DROP COLUMN bio, DROP COLUMN photo, DROP COLUMN photo_mime`);
    // Los estados nuevos no existen en el esquema anterior: se convierten a los más cercanos.
    await q.query(`UPDATE attendances SET status = 'PRESENTE' WHERE status = 'ATRASO'`);
    await q.query(`UPDATE attendances SET status = 'FALTA' WHERE status = 'JUSTIFICADO'`);
    await q.query(`ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_status_check`);
    await q.query(`ALTER TABLE attendances ALTER COLUMN status TYPE VARCHAR(10)`);
    await q.query(`
      ALTER TABLE attendances ADD CONSTRAINT attendances_status_check
        CHECK (status IN ('PRESENTE', 'FALTA'))`);
    await q.query(`
      ALTER TABLE modules
        DROP COLUMN late_rules_enabled, DROP COLUMN open_before_minutes,
        DROP COLUMN tolerance_minutes, DROP COLUMN late_limit_minutes`);
  }
}
