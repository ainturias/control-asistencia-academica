import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1760400000000 implements MigrationInterface {
  name = 'InitialSchema1760400000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE admins (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name     VARCHAR(150) NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE modules (
        id           SERIAL PRIMARY KEY,
        name         VARCHAR(150) NOT NULL,
        is_active    BOOLEAN NOT NULL DEFAULT false,
        activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_at    TIMESTAMPTZ,
        created_by   INT REFERENCES admins(id)
      )`);
    // RN-01: solo un módulo activo a la vez, garantizado por la base.
    await q.query(
      `CREATE UNIQUE INDEX ux_modules_single_active ON modules (is_active) WHERE is_active`,
    );

    await q.query(`
      CREATE TABLE students (
        id                  SERIAL PRIMARY KEY,
        module_id           INT NOT NULL REFERENCES modules(id),
        registration_number VARCHAR(30)  NOT NULL,
        full_name           VARCHAR(150) NOT NULL,
        email               VARCHAR(150) NOT NULL,
        CONSTRAINT ux_students_module_registration UNIQUE (module_id, registration_number)
      )`);
    await q.query(
      `CREATE UNIQUE INDEX ux_students_module_email ON students (module_id, lower(email))`,
    );

    await q.query(`
      CREATE TABLE class_sessions (
        id         SERIAL PRIMARY KEY,
        module_id  INT NOT NULL REFERENCES modules(id),
        class_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time   TIME NOT NULL,
        CONSTRAINT ux_sessions_module_date UNIQUE (module_id, class_date)
      )`);

    await q.query(`
      CREATE TABLE attendances (
        id         SERIAL PRIMARY KEY,
        module_id  INT NOT NULL REFERENCES modules(id),
        student_id INT NOT NULL REFERENCES students(id),
        session_id INT NOT NULL REFERENCES class_sessions(id),
        status     VARCHAR(10) NOT NULL CHECK (status IN ('PRESENTE', 'FALTA')),
        source     VARCHAR(10) NOT NULL CHECK (source IN ('STUDENT', 'ADMIN')),
        marked_at  TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT ux_attendance_student_session UNIQUE (student_id, session_id)
      )`);
    await q.query(`CREATE INDEX ix_attendances_module ON attendances (module_id)`);

    await q.query(`
      CREATE TABLE attendance_changes (
        id            SERIAL PRIMARY KEY,
        attendance_id INT NOT NULL REFERENCES attendances(id),
        admin_id      INT NOT NULL REFERENCES admins(id),
        old_status    VARCHAR(12) NOT NULL,
        new_status    VARCHAR(12) NOT NULL,
        reason        TEXT,
        changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE activity_logs (
        id          SERIAL PRIMARY KEY,
        module_id   INT REFERENCES modules(id),
        actor_type  VARCHAR(10) NOT NULL,
        actor_id    INT NOT NULL,
        actor_name  VARCHAR(150) NOT NULL,
        action      VARCHAR(40) NOT NULL,
        student_id  INT REFERENCES students(id),
        entity      VARCHAR(40),
        entity_id   INT,
        description VARCHAR(300) NOT NULL,
        details     JSONB,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await q.query(
      `CREATE INDEX ix_activity_module_created ON activity_logs (module_id, created_at DESC)`,
    );
    await q.query(`CREATE INDEX ix_activity_student ON activity_logs (student_id)`);
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of [
      'activity_logs',
      'attendance_changes',
      'attendances',
      'class_sessions',
      'students',
      'modules',
      'admins',
    ]) {
      await q.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
