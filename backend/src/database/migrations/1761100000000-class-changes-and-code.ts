import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gestión de fechas del módulo activo (cancelar, reprogramar, recuperar) con historial y fotos,
 * y código de clase opcional para marcar asistencia.
 */
export class ClassChangesAndCode1761100000000 implements MigrationInterface {
  name = 'ClassChangesAndCode1761100000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE class_sessions
        ADD COLUMN status     VARCHAR(12) NOT NULL DEFAULT 'SCHEDULED',
        ADD COLUMN is_makeup  BOOLEAN     NOT NULL DEFAULT false,
        ADD COLUMN class_code VARCHAR(12)`);
    await q.query(`
      ALTER TABLE class_sessions ADD CONSTRAINT class_sessions_status_check
        CHECK (status IN ('SCHEDULED', 'CANCELLED'))`);
    await q.query(`ALTER TABLE modules ADD COLUMN require_class_code BOOLEAN NOT NULL DEFAULT false`);

    await q.query(`
      CREATE TABLE session_changes (
        id         SERIAL PRIMARY KEY,
        module_id  INT NOT NULL REFERENCES modules(id),
        session_id INT NOT NULL REFERENCES class_sessions(id),
        admin_id   INT REFERENCES admins(id),
        action     VARCHAR(12) NOT NULL CHECK (action IN ('CANCEL', 'RESCHEDULE', 'ADD', 'RESTORE')),
        previous   JSONB,
        next       JSONB,
        reason     TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX ix_session_changes_module ON session_changes (module_id, created_at DESC)`);
    await q.query(`
      CREATE TABLE session_change_files (
        id        SERIAL PRIMARY KEY,
        change_id INT NOT NULL REFERENCES session_changes(id) ON DELETE CASCADE,
        mime_type VARCHAR(40) NOT NULL,
        size      INT NOT NULL,
        data      BYTEA NOT NULL
      )`);
    await q.query(`CREATE INDEX ix_session_change_files_parent ON session_change_files (change_id)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS session_change_files`);
    await q.query(`DROP TABLE IF EXISTS session_changes`);
    await q.query(`ALTER TABLE modules DROP COLUMN require_class_code`);
    await q.query(`ALTER TABLE class_sessions DROP CONSTRAINT IF EXISTS class_sessions_status_check`);
    await q.query(`ALTER TABLE class_sessions DROP COLUMN status, DROP COLUMN is_makeup, DROP COLUMN class_code`);
  }
}
