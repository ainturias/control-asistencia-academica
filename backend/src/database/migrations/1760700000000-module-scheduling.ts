import { MigrationInterface, QueryRunner } from 'typeorm';

/** Estado del módulo (activo, programado, finalizado, cancelado) y fecha de activación programada. */
export class ModuleScheduling1760700000000 implements MigrationInterface {
  name = 'ModuleScheduling1760700000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE modules
        ADD COLUMN status        VARCHAR(12) NOT NULL DEFAULT 'CLOSED',
        ADD COLUMN scheduled_for TIMESTAMPTZ`);
    await q.query(`UPDATE modules SET status = CASE WHEN is_active THEN 'ACTIVE' ELSE 'CLOSED' END`);
    await q.query(`
      ALTER TABLE modules ADD CONSTRAINT modules_status_check
        CHECK (status IN ('ACTIVE', 'SCHEDULED', 'CLOSED', 'CANCELLED'))`);
    // Un módulo programado todavía no se activó.
    await q.query(`ALTER TABLE modules ALTER COLUMN activated_at DROP NOT NULL`);
    // Solo un módulo programado a la vez.
    await q.query(
      `CREATE UNIQUE INDEX ux_modules_single_scheduled ON modules (status) WHERE status = 'SCHEDULED'`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS ux_modules_single_scheduled`);
    await q.query(`UPDATE modules SET activated_at = COALESCE(activated_at, scheduled_for, now())`);
    await q.query(`ALTER TABLE modules ALTER COLUMN activated_at SET NOT NULL`);
    await q.query(`ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_status_check`);
    await q.query(`ALTER TABLE modules DROP COLUMN status, DROP COLUMN scheduled_for`);
  }
}
