import { MigrationInterface, QueryRunner } from 'typeorm';

/** Notificaciones guardadas por módulo (para el admin o los estudiantes) y hasta dónde las vio cada usuario. */
export class Notifications1761200000000 implements MigrationInterface {
  name = 'Notifications1761200000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE notifications (
        id         SERIAL PRIMARY KEY,
        module_id  INT NOT NULL REFERENCES modules(id),
        audience   VARCHAR(10) NOT NULL CHECK (audience IN ('ADMIN', 'STUDENT')),
        student_id INT REFERENCES students(id),
        type       VARCHAR(40) NOT NULL,
        title      VARCHAR(200) NOT NULL,
        body       TEXT,
        link       VARCHAR(200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX ix_notifications_feed ON notifications (module_id, audience, created_at DESC)`);
    // Un registro por usuario y módulo: todo lo creado después de last_seen_at está sin leer.
    await q.query(`
      CREATE TABLE notification_seen (
        user_role    VARCHAR(10) NOT NULL,
        user_id      INT NOT NULL,
        module_id    INT NOT NULL REFERENCES modules(id),
        last_seen_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (user_role, user_id, module_id)
      )`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS notification_seen`);
    await q.query(`DROP TABLE IF EXISTS notifications`);
  }
}
