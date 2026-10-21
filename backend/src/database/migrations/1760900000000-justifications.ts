import { MigrationInterface, QueryRunner } from 'typeorm';

/** Justificaciones de inasistencia con imágenes de respaldo, enviadas por el estudiante o el admin. */
export class Justifications1760900000000 implements MigrationInterface {
  name = 'Justifications1760900000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE justifications (
        id              SERIAL PRIMARY KEY,
        module_id       INT NOT NULL REFERENCES modules(id),
        student_id      INT NOT NULL REFERENCES students(id),
        session_id      INT NOT NULL REFERENCES class_sessions(id),
        origin          VARCHAR(10) NOT NULL CHECK (origin IN ('STUDENT', 'ADMIN')),
        reason          TEXT NOT NULL,
        status          VARCHAR(10) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        resolved_status VARCHAR(12),
        review_comment  TEXT,
        reviewed_by     INT REFERENCES admins(id),
        reviewed_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    // Una sola solicitud pendiente por estudiante y fecha de clase.
    await q.query(
      `CREATE UNIQUE INDEX ux_justifications_pending ON justifications (student_id, session_id) WHERE status = 'PENDING'`,
    );
    await q.query(`CREATE INDEX ix_justifications_module_status ON justifications (module_id, status)`);

    await q.query(`
      CREATE TABLE justification_files (
        id               SERIAL PRIMARY KEY,
        justification_id INT NOT NULL REFERENCES justifications(id) ON DELETE CASCADE,
        mime_type        VARCHAR(40) NOT NULL,
        size             INT NOT NULL,
        data             BYTEA NOT NULL
      )`);
    await q.query(`CREATE INDEX ix_justification_files_parent ON justification_files (justification_id)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS justification_files`);
    await q.query(`DROP TABLE IF EXISTS justifications`);
  }
}
