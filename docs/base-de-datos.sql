-- =====================================================================================
--  Sistema Web de Registro y Control de Asistencia
--  Script de creación de la base de datos (PostgreSQL)
--
--  Genera las 13 tablas de la aplicación con sus claves, relaciones, restricciones
--  e índices, exactamente como quedan después de aplicar todas las migraciones
--  (hasta 1761300000000-class-hours-only).
--
--  Cómo usarlo:
--    1. Crear una base vacía:        CREATE DATABASE modulo2;
--    2. Conectarse a esa base y ejecutar este archivo:
--         psql -U postgres -d modulo2 -f base-de-datos.sql
--       (o abrirlo en el Query Tool de pgAdmin y ejecutarlo).
--    3. Iniciar el servidor: crea el administrador inicial y no vuelve a aplicar
--       migraciones, porque al final del script quedan registradas como aplicadas.
--
--  Todo se ejecuta en una sola transacción: si algo falla, no se crea nada.
-- =====================================================================================

BEGIN;

-- -------------------------------------------------------------------------------------
--  1. NÚCLEO
-- -------------------------------------------------------------------------------------

-- Administradores (también son los docentes de los módulos que activan)
CREATE TABLE admins (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,                 -- contraseña cifrada con bcrypt
    full_name     VARCHAR(150) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    title         VARCHAR(60),                           -- grado académico
    phone         VARCHAR(30),
    specialty     VARCHAR(150),
    bio           TEXT,
    photo         BYTEA,                                 -- foto de perfil (hasta 2 MB)
    photo_mime    VARCHAR(40)
);

-- Módulos académicos y sus reglas de asistencia
CREATE TABLE modules (
    id                        SERIAL PRIMARY KEY,
    name                      VARCHAR(150) NOT NULL,
    is_active                 BOOLEAN      NOT NULL DEFAULT false,
    activated_at              TIMESTAMPTZ  DEFAULT now(),
    closed_at                 TIMESTAMPTZ,
    created_by                INTEGER      REFERENCES admins (id),
    -- Reglas de puntualidad (opcionales, desactivadas por defecto)
    late_rules_enabled        BOOLEAN      NOT NULL DEFAULT false,
    open_before_minutes       INTEGER      NOT NULL DEFAULT 15,
    tolerance_minutes         INTEGER      NOT NULL DEFAULT 20,
    late_limit_minutes        INTEGER      NOT NULL DEFAULT 60,
    -- Puntuación y asistencia mínima
    present_points            INTEGER      NOT NULL DEFAULT 2,
    late_points               INTEGER      NOT NULL DEFAULT 1,
    min_attendance_percentage INTEGER      NOT NULL DEFAULT 80,
    -- Estado y activación programada
    status                    VARCHAR(12)  NOT NULL DEFAULT 'CLOSED'
                              CHECK (status IN ('ACTIVE', 'SCHEDULED', 'CLOSED', 'CANCELLED')),
    scheduled_for             TIMESTAMPTZ,
    -- Columnas adicionales del Excel de estudiantes
    extra_fields              JSONB        NOT NULL DEFAULT '[]',
    -- Otras reglas
    justification_days        INTEGER      NOT NULL DEFAULT 3,
    require_class_code        BOOLEAN      NOT NULL DEFAULT false,
    class_hours_only          BOOLEAN      NOT NULL DEFAULT false
);

-- RN-01: solo un módulo activo a la vez
CREATE UNIQUE INDEX ux_modules_single_active ON modules (is_active) WHERE is_active;
-- Solo un módulo programado a la vez
CREATE UNIQUE INDEX ux_modules_single_scheduled ON modules (status) WHERE status = 'SCHEDULED';

-- -------------------------------------------------------------------------------------
--  2. ESTUDIANTES, CLASES Y ASISTENCIA
-- -------------------------------------------------------------------------------------

-- Estudiantes de cada módulo
CREATE TABLE students (
    id                  SERIAL PRIMARY KEY,
    module_id           INTEGER      NOT NULL REFERENCES modules (id),
    registration_number VARCHAR(30)  NOT NULL,
    full_name           VARCHAR(150) NOT NULL,
    email               VARCHAR(150) NOT NULL,
    extra               JSONB        NOT NULL DEFAULT '{}',   -- valores de las columnas adicionales
    active              BOOLEAN      NOT NULL DEFAULT true,   -- false = dado de baja (no se borra)
    -- RN-02: número de registro único dentro del módulo
    CONSTRAINT ux_students_module_registration UNIQUE (module_id, registration_number)
);

-- Correo único dentro del módulo, sin distinguir mayúsculas
CREATE UNIQUE INDEX ux_students_module_email ON students (module_id, lower(email));

-- Fechas de clase de cada módulo
CREATE TABLE class_sessions (
    id         SERIAL PRIMARY KEY,
    module_id  INTEGER     NOT NULL REFERENCES modules (id),
    class_date DATE        NOT NULL,
    start_time TIME        NOT NULL,
    end_time   TIME        NOT NULL,
    status     VARCHAR(12) NOT NULL DEFAULT 'SCHEDULED'
               CHECK (status IN ('SCHEDULED', 'CANCELLED')),
    is_makeup  BOOLEAN     NOT NULL DEFAULT false,      -- clase de recuperación
    class_code VARCHAR(12),                             -- código que publica el docente
    -- Una sola clase por día en cada módulo
    CONSTRAINT ux_sessions_module_date UNIQUE (module_id, class_date)
);

-- Asistencias (las faltas sin marca no se guardan: se calculan al consultar, RN-05)
CREATE TABLE attendances (
    id         SERIAL PRIMARY KEY,
    module_id  INTEGER     NOT NULL REFERENCES modules (id),
    student_id INTEGER     NOT NULL REFERENCES students (id),
    session_id INTEGER     NOT NULL REFERENCES class_sessions (id),
    status     VARCHAR(12) NOT NULL
               CHECK (status IN ('PRESENTE', 'ATRASO', 'FALTA', 'JUSTIFICADO')),
    source     VARCHAR(10) NOT NULL
               CHECK (source IN ('STUDENT', 'ADMIN')),
    marked_at  TIMESTAMPTZ,                             -- hora real de la marca del estudiante
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- RN-03: una sola marca por estudiante y clase
    CONSTRAINT ux_attendance_student_session UNIQUE (student_id, session_id)
);

CREATE INDEX ix_attendances_module ON attendances (module_id);

-- RN-07: auditoría de cada corrección del administrador
CREATE TABLE attendance_changes (
    id            SERIAL PRIMARY KEY,
    attendance_id INTEGER     NOT NULL REFERENCES attendances (id),
    admin_id      INTEGER     NOT NULL REFERENCES admins (id),
    old_status    VARCHAR(12) NOT NULL,
    new_status    VARCHAR(12) NOT NULL,
    reason        TEXT,
    changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------------------
--  3. JUSTIFICACIONES
-- -------------------------------------------------------------------------------------

CREATE TABLE justifications (
    id              SERIAL PRIMARY KEY,
    module_id       INTEGER     NOT NULL REFERENCES modules (id),
    student_id      INTEGER     NOT NULL REFERENCES students (id),
    session_id      INTEGER     NOT NULL REFERENCES class_sessions (id),
    origin          VARCHAR(10) NOT NULL
                    CHECK (origin IN ('STUDENT', 'ADMIN')),
    reason          TEXT        NOT NULL,
    status          VARCHAR(10) NOT NULL
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    resolved_status VARCHAR(12),                        -- estado con que se aprobó
    review_comment  TEXT,
    reviewed_by     INTEGER     REFERENCES admins (id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una sola justificación pendiente por estudiante y clase
CREATE UNIQUE INDEX ux_justifications_pending ON justifications (student_id, session_id) WHERE status = 'PENDING';
CREATE INDEX ix_justifications_module_status ON justifications (module_id, status);

-- Imágenes de prueba de cada justificación
CREATE TABLE justification_files (
    id               SERIAL PRIMARY KEY,
    justification_id INTEGER     NOT NULL REFERENCES justifications (id) ON DELETE CASCADE,
    mime_type        VARCHAR(40) NOT NULL,
    size             INTEGER     NOT NULL,
    data             BYTEA       NOT NULL
);

CREATE INDEX ix_justification_files_parent ON justification_files (justification_id);

-- -------------------------------------------------------------------------------------
--  4. CAMBIOS DE CLASES
-- -------------------------------------------------------------------------------------

CREATE TABLE session_changes (
    id         SERIAL PRIMARY KEY,
    module_id  INTEGER     NOT NULL REFERENCES modules (id),
    session_id INTEGER     NOT NULL REFERENCES class_sessions (id),
    admin_id   INTEGER     REFERENCES admins (id),
    action     VARCHAR(12) NOT NULL
               CHECK (action IN ('CANCEL', 'RESCHEDULE', 'ADD', 'RESTORE')),
    previous   JSONB,                                   -- fecha y horario antes del cambio
    next       JSONB,                                   -- fecha y horario después del cambio
    reason     TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_session_changes_module ON session_changes (module_id, created_at DESC);

-- Fotos de respaldo de cada cambio de clase
CREATE TABLE session_change_files (
    id        SERIAL PRIMARY KEY,
    change_id INTEGER     NOT NULL REFERENCES session_changes (id) ON DELETE CASCADE,
    mime_type VARCHAR(40) NOT NULL,
    size      INTEGER     NOT NULL,
    data      BYTEA       NOT NULL
);

CREATE INDEX ix_session_change_files_parent ON session_change_files (change_id);

-- -------------------------------------------------------------------------------------
--  5. HISTORIAL Y NOTIFICACIONES
-- -------------------------------------------------------------------------------------

-- RF-09: historial de actividades
CREATE TABLE activity_logs (
    id          SERIAL PRIMARY KEY,
    module_id   INTEGER      REFERENCES modules (id),
    actor_type  VARCHAR(10)  NOT NULL,                  -- ADMIN o STUDENT
    actor_id    INTEGER      NOT NULL,
    actor_name  VARCHAR(150) NOT NULL,
    action      VARCHAR(40)  NOT NULL,                  -- LOGIN, MARK_ATTENDANCE, EDIT_ATTENDANCE...
    student_id  INTEGER      REFERENCES students (id),
    entity      VARCHAR(40),
    entity_id   INTEGER,
    description VARCHAR(300) NOT NULL,
    details     JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_activity_module_created ON activity_logs (module_id, created_at DESC);
CREATE INDEX ix_activity_student ON activity_logs (student_id);

-- Notificaciones de la campana
CREATE TABLE notifications (
    id         SERIAL PRIMARY KEY,
    module_id  INTEGER      NOT NULL REFERENCES modules (id),
    audience   VARCHAR(10)  NOT NULL
               CHECK (audience IN ('ADMIN', 'STUDENT')),
    student_id INTEGER      REFERENCES students (id),   -- vacío = todos los estudiantes del módulo
    type       VARCHAR(40)  NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    link       VARCHAR(200),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_notifications_feed ON notifications (module_id, audience, created_at DESC);

-- Hasta cuándo leyó cada usuario las notificaciones de un módulo
CREATE TABLE notification_seen (
    user_role    VARCHAR(10) NOT NULL,
    user_id      INTEGER     NOT NULL,
    module_id    INTEGER     NOT NULL REFERENCES modules (id),
    last_seen_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_role, user_id, module_id)
);

-- -------------------------------------------------------------------------------------
--  6. CONTROL DE MIGRACIONES (TypeORM)
--  Registra las migraciones como aplicadas para que el servidor no intente crearlas
--  de nuevo al iniciar.
-- -------------------------------------------------------------------------------------

CREATE TABLE migrations (
    id          SERIAL,
    "timestamp" BIGINT            NOT NULL,
    name        CHARACTER VARYING NOT NULL,
    CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id)
);

INSERT INTO migrations ("timestamp", name) VALUES
    (1760400000000, 'InitialSchema1760400000000'),
    (1760500000000, 'AttendanceRulesAndProfile1760500000000'),
    (1760600000000, 'AttendanceScoring1760600000000'),
    (1760700000000, 'ModuleScheduling1760700000000'),
    (1760800000000, 'StudentEditingExtraFields1760800000000'),
    (1760900000000, 'Justifications1760900000000'),
    (1761000000000, 'JustificationDays1761000000000'),
    (1761100000000, 'ClassChangesAndCode1761100000000'),
    (1761200000000, 'Notifications1761200000000'),
    (1761300000000, 'ClassHoursOnly1761300000000');

-- -------------------------------------------------------------------------------------
--  7. DESCRIPCIONES (visibles en pgAdmin: pestaña Properties / columna Comment)
-- -------------------------------------------------------------------------------------

COMMENT ON TABLE admins IS 'Administradores y docentes. Guarda a las personas que administran el sistema. Cada administrador es también el docente del módulo que activa: sus datos de perfil (grado, especialidad, foto) aparecen en el calendario y en el panel del estudiante.';
COMMENT ON COLUMN admins.id IS 'Identificador único del administrador.';
COMMENT ON COLUMN admins.email IS 'Correo con el que inicia sesión. No se repite entre administradores.';
COMMENT ON COLUMN admins.password_hash IS 'Contraseña cifrada con bcrypt. Nunca se guarda la contraseña en texto plano.';
COMMENT ON COLUMN admins.full_name IS 'Nombre completo del docente.';
COMMENT ON COLUMN admins.created_at IS 'Fecha y hora de creación de la cuenta.';
COMMENT ON COLUMN admins.title IS 'Grado académico (por ejemplo "Ing." o "Lic.").';
COMMENT ON COLUMN admins.phone IS 'Teléfono de contacto que ven los estudiantes.';
COMMENT ON COLUMN admins.specialty IS 'Especialidad o área del docente.';
COMMENT ON COLUMN admins.bio IS 'Presentación breve del docente.';
COMMENT ON COLUMN admins.photo IS 'Foto de perfil (archivo binario, hasta 2 MB).';
COMMENT ON COLUMN admins.photo_mime IS 'Tipo de la imagen: image/jpeg, image/png o image/webp.';

COMMENT ON TABLE modules IS 'Módulos académicos. Cada fila es un módulo (un curso o periodo). Es la tabla central: estudiantes, fechas de clase, asistencias, justificaciones, actividades y notificaciones pertenecen a un módulo. Además guarda las reglas de asistencia del módulo.';
COMMENT ON COLUMN modules.id IS 'Identificador único del módulo.';
COMMENT ON COLUMN modules.name IS 'Nombre del módulo (por ejemplo "MODULO PRACTICA").';
COMMENT ON COLUMN modules.is_active IS 'Verdadero solo para el módulo en uso. Un índice único garantiza que haya uno solo (RN-01).';
COMMENT ON COLUMN modules.activated_at IS 'Fecha y hora en que el módulo empezó a estar activo.';
COMMENT ON COLUMN modules.closed_at IS 'Fecha y hora en que el módulo terminó (fue reemplazado por otro).';
COMMENT ON COLUMN modules.created_by IS 'Administrador que lo creó; figura como docente del módulo.';
COMMENT ON COLUMN modules.late_rules_enabled IS 'Reglas de puntualidad activadas (Presente, Atraso, Falta según la hora). Desactivadas por defecto.';
COMMENT ON COLUMN modules.open_before_minutes IS 'Con puntualidad: minutos antes del inicio de la clase en que se habilita la marca.';
COMMENT ON COLUMN modules.tolerance_minutes IS 'Con puntualidad: minutos después del inicio en que la marca todavía es Presente.';
COMMENT ON COLUMN modules.late_limit_minutes IS 'Con puntualidad: minutos después del inicio hasta los que la marca es Atraso. Después ya no se puede marcar.';
COMMENT ON COLUMN modules.present_points IS 'Puntos que vale una sesión con Presente (también es el máximo por sesión).';
COMMENT ON COLUMN modules.late_points IS 'Puntos que vale una sesión con Atraso.';
COMMENT ON COLUMN modules.min_attendance_percentage IS 'Porcentaje mínimo de asistencia. Por debajo, el estudiante figura "en riesgo".';
COMMENT ON COLUMN modules.status IS 'Estado del módulo (ver valores permitidos).';
COMMENT ON COLUMN modules.scheduled_for IS 'Fecha y hora en que se activará un módulo programado.';
COMMENT ON COLUMN modules.extra_fields IS 'Lista (JSON) de columnas adicionales del Excel de estudiantes: clave, nombre visible y si el estudiante puede verla.';
COMMENT ON COLUMN modules.justification_days IS 'Días después de la clase en que el estudiante puede enviar una justificación. 0 = no puede.';
COMMENT ON COLUMN modules.require_class_code IS 'El estudiante debe escribir el código que publica el docente para poder marcar.';
COMMENT ON COLUMN modules.class_hours_only IS 'Sin puntualidad: la marca solo se acepta entre la hora de inicio y la de fin de cada clase, en vez de todo el día.';

COMMENT ON TABLE students IS 'Estudiantes. Estudiantes inscritos en un módulo. Un mismo estudiante que cursa dos módulos aparece dos veces, una por módulo, para que cada módulo conserve sus datos.';
COMMENT ON COLUMN students.id IS 'Identificador único del estudiante en el sistema.';
COMMENT ON COLUMN students.module_id IS 'Módulo al que pertenece.';
COMMENT ON COLUMN students.registration_number IS 'Número de registro. Único dentro del módulo (RN-02). Sirve para iniciar sesión.';
COMMENT ON COLUMN students.full_name IS 'Nombre completo.';
COMMENT ON COLUMN students.email IS 'Correo electrónico. Único dentro del módulo, sin distinguir mayúsculas. Sirve para iniciar sesión.';
COMMENT ON COLUMN students.extra IS 'Valores (JSON) de las columnas adicionales del Excel: teléfono, carrera, CI, etc.';
COMMENT ON COLUMN students.active IS 'Falso si fue dado de baja: no puede ingresar ni figura en las asistencias, pero sus registros se conservan.';

COMMENT ON TABLE class_sessions IS 'Fechas de clase. Cada fila es una clase programada del módulo, con su fecha y su horario. Las fechas determinan los días en que se puede marcar asistencia.';
COMMENT ON COLUMN class_sessions.id IS 'Identificador único de la clase.';
COMMENT ON COLUMN class_sessions.module_id IS 'Módulo al que pertenece la clase.';
COMMENT ON COLUMN class_sessions.class_date IS 'Fecha de la clase. Solo hay una clase por día en cada módulo.';
COMMENT ON COLUMN class_sessions.start_time IS 'Hora de inicio.';
COMMENT ON COLUMN class_sessions.end_time IS 'Hora de fin (posterior a la de inicio).';
COMMENT ON COLUMN class_sessions.status IS 'Estado de la clase (ver valores permitidos).';
COMMENT ON COLUMN class_sessions.is_makeup IS 'Verdadero si es una clase de recuperación agregada después de activar el módulo.';
COMMENT ON COLUMN class_sessions.class_code IS 'Código que el docente publica para esa clase cuando el módulo exige código. Solo lo ve el administrador.';

COMMENT ON TABLE attendances IS 'Asistencias. Registra la asistencia de un estudiante a una clase: la marca que hace el propio estudiante o la corrección del administrador. Las faltas sin marca NO se guardan: se calculan al consultar (RN-05).';
COMMENT ON COLUMN attendances.id IS 'Identificador único del registro.';
COMMENT ON COLUMN attendances.module_id IS 'Módulo al que pertenece (permite consultar rápido por módulo).';
COMMENT ON COLUMN attendances.student_id IS 'Estudiante.';
COMMENT ON COLUMN attendances.session_id IS 'Clase. Solo puede haber un registro por estudiante y clase (RN-03).';
COMMENT ON COLUMN attendances.status IS 'Estado de la asistencia (ver valores permitidos).';
COMMENT ON COLUMN attendances.source IS 'Quién hizo el último registro: el estudiante o el administrador.';
COMMENT ON COLUMN attendances.marked_at IS 'Fecha y hora real de la marca del estudiante (RF-03). Vacía si la registró el administrador.';
COMMENT ON COLUMN attendances.updated_at IS 'Fecha y hora del último cambio.';

COMMENT ON TABLE attendance_changes IS 'Auditoría de asistencias. Historial de cada corrección que hace un administrador sobre una asistencia: valor anterior, valor nuevo, quién, cuándo y por qué (RF-07, RN-07). Nunca se modifica ni se borra.';
COMMENT ON COLUMN attendance_changes.id IS 'Identificador único del cambio.';
COMMENT ON COLUMN attendance_changes.attendance_id IS 'Registro de asistencia que se cambió.';
COMMENT ON COLUMN attendance_changes.admin_id IS 'Administrador que hizo el cambio.';
COMMENT ON COLUMN attendance_changes.old_status IS 'Estado anterior (puede ser PENDIENTE o FALTA calculada si no había registro).';
COMMENT ON COLUMN attendance_changes.new_status IS 'Estado nuevo.';
COMMENT ON COLUMN attendance_changes.reason IS 'Motivo escrito por el administrador.';
COMMENT ON COLUMN attendance_changes.changed_at IS 'Fecha y hora del cambio.';

COMMENT ON TABLE justifications IS 'Justificaciones. Solicitudes para justificar una falta o un atraso con imágenes de prueba. El estudiante la envía y el administrador la aprueba (cambiando la asistencia) o la rechaza. El administrador también puede registrar una ya aprobada.';
COMMENT ON COLUMN justifications.id IS 'Identificador único de la justificación.';
COMMENT ON COLUMN justifications.module_id IS 'Módulo.';
COMMENT ON COLUMN justifications.student_id IS 'Estudiante que justifica.';
COMMENT ON COLUMN justifications.session_id IS 'Clase que se justifica. Solo puede haber una pendiente por estudiante y clase.';
COMMENT ON COLUMN justifications.origin IS 'Quién la creó (ver valores permitidos).';
COMMENT ON COLUMN justifications.reason IS 'Motivo (entre 5 y 1000 caracteres).';
COMMENT ON COLUMN justifications.status IS 'Estado de la revisión (ver valores permitidos).';
COMMENT ON COLUMN justifications.resolved_status IS 'Estado de asistencia con que se aprobó: PRESENTE, ATRASO o JUSTIFICADO.';
COMMENT ON COLUMN justifications.review_comment IS 'Comentario del docente al aprobar o rechazar.';
COMMENT ON COLUMN justifications.reviewed_by IS 'Administrador que la revisó.';
COMMENT ON COLUMN justifications.reviewed_at IS 'Fecha y hora de la revisión.';
COMMENT ON COLUMN justifications.created_at IS 'Fecha y hora de envío.';

COMMENT ON TABLE justification_files IS 'Imágenes de justificaciones. Imágenes de prueba adjuntas a una justificación (hasta 4, de hasta 3 MB cada una).';
COMMENT ON COLUMN justification_files.id IS 'Identificador único de la imagen.';
COMMENT ON COLUMN justification_files.justification_id IS 'Justificación a la que pertenece.';
COMMENT ON COLUMN justification_files.mime_type IS 'Tipo de la imagen: image/jpeg, image/png o image/webp.';
COMMENT ON COLUMN justification_files.size IS 'Tamaño en bytes.';
COMMENT ON COLUMN justification_files.data IS 'Contenido de la imagen (binario).';

COMMENT ON TABLE session_changes IS 'Cambios de clases. Historial de cambios en las fechas del módulo activo: cancelar, restaurar, reprogramar o agregar una clase de recuperación, con el motivo. Lo ven el administrador y los estudiantes.';
COMMENT ON COLUMN session_changes.id IS 'Identificador único del cambio.';
COMMENT ON COLUMN session_changes.module_id IS 'Módulo.';
COMMENT ON COLUMN session_changes.session_id IS 'Clase afectada.';
COMMENT ON COLUMN session_changes.admin_id IS 'Administrador que hizo el cambio.';
COMMENT ON COLUMN session_changes.action IS 'Tipo de cambio (ver valores permitidos).';
COMMENT ON COLUMN session_changes.previous IS 'Fecha y horario antes del cambio (JSON: date, startTime, endTime).';
COMMENT ON COLUMN session_changes.next IS 'Fecha y horario después del cambio (JSON).';
COMMENT ON COLUMN session_changes.reason IS 'Motivo del cambio.';
COMMENT ON COLUMN session_changes.created_at IS 'Fecha y hora del cambio.';

COMMENT ON TABLE session_change_files IS 'Fotos de cambios de clases. Fotos de respaldo de un cambio de clase (hasta 3).';
COMMENT ON COLUMN session_change_files.id IS 'Identificador único de la foto.';
COMMENT ON COLUMN session_change_files.change_id IS 'Cambio de clase al que pertenece.';
COMMENT ON COLUMN session_change_files.mime_type IS 'Tipo de la imagen.';
COMMENT ON COLUMN session_change_files.size IS 'Tamaño en bytes.';
COMMENT ON COLUMN session_change_files.data IS 'Contenido de la imagen (binario).';

COMMENT ON TABLE activity_logs IS 'Historial de actividades. Registra las acciones importantes de estudiantes y administradores: quién, qué, cuándo y sobre qué registro (RF-09). El administrador lo consulta con filtros en "Actividades" (RF-10).';
COMMENT ON COLUMN activity_logs.id IS 'Identificador único de la actividad.';
COMMENT ON COLUMN activity_logs.module_id IS 'Módulo en el que ocurrió (vacío si no había módulo activo).';
COMMENT ON COLUMN activity_logs.actor_type IS 'Rol de quien hizo la acción: ADMIN o STUDENT.';
COMMENT ON COLUMN activity_logs.actor_id IS 'Identificador de quien hizo la acción.';
COMMENT ON COLUMN activity_logs.actor_name IS 'Nombre de quien hizo la acción, guardado tal como era en ese momento.';
COMMENT ON COLUMN activity_logs.action IS 'Código de la acción (ver valores permitidos).';
COMMENT ON COLUMN activity_logs.student_id IS 'Estudiante afectado, si corresponde.';
COMMENT ON COLUMN activity_logs.entity IS 'Tipo de registro afectado: attendance, justification, module, session o student.';
COMMENT ON COLUMN activity_logs.entity_id IS 'Identificador del registro afectado.';
COMMENT ON COLUMN activity_logs.description IS 'Texto legible de lo que pasó (por ejemplo "Juan Pérez marcó asistencia del 14/10/2026").';
COMMENT ON COLUMN activity_logs.details IS 'Datos adicionales (JSON), como el estado anterior y el nuevo.';
COMMENT ON COLUMN activity_logs.created_at IS 'Fecha y hora de la acción.';

COMMENT ON TABLE notifications IS 'Notificaciones. Avisos que aparecen en la campana: para los administradores (marcas, justificaciones enviadas, módulos activados) o para los estudiantes (clases canceladas, códigos publicados, justificaciones revisadas).';
COMMENT ON COLUMN notifications.id IS 'Identificador único de la notificación.';
COMMENT ON COLUMN notifications.module_id IS 'Módulo al que pertenece.';
COMMENT ON COLUMN notifications.audience IS 'A quién va dirigida: ADMIN o STUDENT.';
COMMENT ON COLUMN notifications.student_id IS 'Si se llena, solo la ve ese estudiante; si está vacía, todos los del módulo.';
COMMENT ON COLUMN notifications.type IS 'Tipo de aviso (ver valores permitidos).';
COMMENT ON COLUMN notifications.title IS 'Título del aviso.';
COMMENT ON COLUMN notifications.body IS 'Detalle del aviso.';
COMMENT ON COLUMN notifications.link IS 'Pantalla a la que lleva al pulsarlo.';
COMMENT ON COLUMN notifications.created_at IS 'Fecha y hora del aviso.';

COMMENT ON TABLE notification_seen IS 'Lectura de notificaciones. Guarda hasta cuándo leyó cada usuario las notificaciones de un módulo, para mostrar el contador de "no leídas".';
COMMENT ON COLUMN notification_seen.user_role IS 'Rol del usuario: ADMIN o STUDENT.';
COMMENT ON COLUMN notification_seen.user_id IS 'Identificador del usuario.';
COMMENT ON COLUMN notification_seen.module_id IS 'Módulo.';
COMMENT ON COLUMN notification_seen.last_seen_at IS 'Última vez que abrió las notificaciones. Las posteriores cuentan como no leídas.';

COMMIT;
