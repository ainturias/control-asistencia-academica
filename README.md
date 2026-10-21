# Sistema de Registro y Control de Asistencia

Aplicación web para registrar y consultar la asistencia de estudiantes por módulo académico. El
sistema se reutiliza en sucesivos módulos: el administrador carga en Excel los estudiantes y las
fechas de clase, los estudiantes marcan su asistencia en los días de clase y el administrador
consulta, corrige y exporta los registros.

El alcance base está definido en [`Requerimientos_Control_Asistencia.pdf`](Requerimientos_Control_Asistencia.pdf).
Además se implementaron varias funcionalidades adicionales; están descritas en la sección
[Funcionalidades adicionales](#funcionalidades-adicionales-fuera-del-documento). Todas respetan el
documento: las que lo contradicen, como el cálculo de atrasos, vienen **desactivadas por defecto**.

## Contenido

1. [Tecnologías](#tecnologías)
2. [Puesta en marcha](#puesta-en-marcha)
3. [Prueba rápida](#prueba-rápida)
4. [Funcionalidades del estudiante](#funcionalidades-del-estudiante)
5. [Funcionalidades del administrador](#funcionalidades-del-administrador)
6. [Funcionalidades generales](#funcionalidades-generales)
7. [Cumplimiento del documento de requerimientos](#cumplimiento-del-documento-de-requerimientos)
8. [Funcionalidades adicionales (fuera del documento)](#funcionalidades-adicionales-fuera-del-documento)
9. [Reglas de negocio](#reglas-de-negocio)
10. [Formatos de Excel](#formatos-de-excel)
11. [Arquitectura](#arquitectura)
12. [Base de datos](#base-de-datos)
13. [API](#api)
14. [Pruebas y calidad](#pruebas-y-calidad)
15. [Seguridad y consideraciones](#seguridad-y-consideraciones)

---

## Tecnologías

| Capa | Tecnologías |
|---|---|
| Backend | NestJS 12, TypeORM, PostgreSQL, JWT, exceljs (lectura y exportación de Excel), Socket.IO (tiempo real) |
| Frontend | React 19, Vite, Tailwind CSS 4, TanStack Query (React Query), React Router, socket.io-client, lucide-react, html-to-image |
| Pruebas | Jest (backend), oxlint, ESLint, TypeScript estricto |

El backend usa **arquitectura hexagonal por funcionalidad** y el frontend **Clean Architecture por
funcionalidad**. Los detalles están en [Arquitectura](#arquitectura).

---

## Puesta en marcha

### Requisitos

- Node.js 20 o superior.
- PostgreSQL con una base de datos llamada `modulo2` (o la que indique `DB_NAME`).

### 1. Base de datos

Solo la primera vez:

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '123456789';"
sudo -u postgres psql -c "CREATE DATABASE modulo2;"
```

Si PostgreSQL no está corriendo: `sudo systemctl start postgresql`.

### 2. Backend (http://localhost:3000/api)

```bash
cd backend
cp .env.example .env        # ajusta DB_PASSWORD, JWT_SECRET y el administrador inicial
npm install
npm run start:dev
```

Al iniciar, el servidor:

- aplica automáticamente todas las migraciones pendientes;
- crea el administrador inicial si todavía no existe;
- empieza a revisar cada 30 segundos si hay un módulo programado que deba activarse.

### 3. Frontend (http://localhost:5173)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite redirige las peticiones a `/api` hacia el backend (`localhost:3000`), incluida la conexión en
tiempo real (`/api/socket.io`). Para que otro
dispositivo de la misma red entre al sistema: `npm run dev -- --host` y abrir la IP de la
computadora, por ejemplo `http://192.168.1.50:5173`.

### Variables de entorno (`backend/.env`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del backend |
| `CORS_ORIGIN` | `http://localhost:5173` | Orígenes permitidos, separados por coma |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | Conexión a PostgreSQL |
| `DB_USER` / `DB_PASSWORD` | `postgres` / `...` | Credenciales de la base |
| `DB_NAME` | `modulo2` | Nombre de la base |
| `JWT_SECRET` | texto largo y aleatorio | Firma de los tokens de sesión |
| `JWT_EXPIRES_IN` | `8h` | Duración de la sesión |
| `APP_TZ` | `America/La_Paz` | Zona horaria con la que el servidor decide qué día y hora es |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `admin@gmail.com` / ... | Administrador inicial |

El frontend acepta opcionalmente `VITE_API_URL` (por defecto `/api`).

El administrador inicial se crea **solo si no existe**. Si después cambias `ADMIN_PASSWORD` en el
`.env`, no se actualiza en la base de datos.

El archivo `backend/.env` está en `backend/.gitignore` y no se sube al repositorio. Solo se versiona
`backend/.env.example`, que debe contener valores de ejemplo y no contraseñas reales.

---

## Prueba rápida

1. Ingresa como administrador: `admin@gmail.com` / `123456789`.
2. Entra a **Nuevo módulo**, escribe un nombre y sube `ejemplos/estudiantes.xlsx` y `ejemplos/fechas.xlsx`.
3. Pulsa **Validar y ver vista previa**, revisa los datos y pulsa **Activar módulo**.
4. Cierra sesión. En la pestaña **Estudiante**, ingresa con `juan@gmail.com` o con el número `1001`.
5. Marca la asistencia (solo funciona si hoy es un día de clase del archivo de fechas).

Archivos de la carpeta [`ejemplos/`](ejemplos/):

| Archivo | Uso |
|---|---|
| `estudiantes.xlsx` / `fechas.xlsx` | Datos válidos para una prueba normal (8 estudiantes y sus fechas) |
| `estudiantes_con_errores.xlsx` / `fechas_con_errores.xlsx` | Muestran las validaciones y la corrección en la vista previa |
| `estudiantes_grande.xlsx` / `fechas_grande.xlsx` | Prueba con más datos (80 estudiantes y 30 fechas) |
| `generar-ejemplos.cjs` / `generar-ejemplos-grandes.cjs` | Regeneran los archivos (`node ejemplos/generar-ejemplos.cjs`) |

---

## Funcionalidades del estudiante

El estudiante ingresa **solo con su correo o su número de registro**, sin contraseña, tal como pide
RF-01. Su panel tiene tres secciones: **Inicio**, **Módulo** y **Mi perfil**.

### Inicio

- **Clase de hoy:** fecha, horario y botón **Marcar asistencia**. El botón solo se habilita un día de
  clase. Si las reglas de puntualidad están activas, además debe estar dentro del horario permitido.
- **Cuenta regresiva:** muestra cuánto falta para que se habilite el registro, cuánto tiempo queda para
  marcar como Presente y cuánto para marcar con Atraso. Al terminar cada tramo, la pantalla se actualiza
  sola. Los segundos los calcula el servidor; la hora del dispositivo no influye.
- **Resultado del día:** Asistencia registrada (con la hora de la marca), registrada con atraso, falta o
  falta justificada.
- **Alerta de riesgo:** aparece si el porcentaje de asistencia está por debajo del mínimo del módulo.
- **Resumen:** asistencias, atrasos (si la puntualidad está activa), faltas, clases por venir, porcentaje
  y puntos.
- **Historial, al estilo del aula virtual:**
  - Columnas: Fecha y horario, Descripción, Estado, Puntuación (por ejemplo `2 / 2`) y Observaciones.
    Las observaciones dicen "Autograbado" y la hora si marcó el estudiante, o el motivo que escribió el
    administrador al corregir.
  - Filtros: Todas, Hasta hoy, Mensual y Semanal, con navegación entre meses y semanas.
  - Resumen del periodo: sesiones registradas, puntos sobre las sesiones completadas y porcentaje.

### Módulo

- **Calendario de clases:** meses con los días de clase marcados, inicio y fin del módulo, días y
  horario de las clases sincrónicas (por ejemplo "Lunes, miércoles y viernes, 18:00 - 21:00") y total
  de clases.
- **Compartir y descargar** el calendario como imagen.
- **Perfil del docente:** foto, grado académico, nombre, especialidad, presentación, correo y teléfono.
- **Cómo se registra mi asistencia:** explica las reglas vigentes con un ejemplo real del módulo
  (tramos de Presente, Atraso y Falta, puntos y asistencia mínima).

### Mi perfil

- Datos personales: número de registro, correo, módulo y docente.
- **Campos adicionales** del módulo que el administrador marcó como visibles para el estudiante.
- Avance: porcentaje de asistencia con el mínimo marcado en la barra, puntos obtenidos y clases por venir.

---

## Funcionalidades del administrador

El administrador ingresa con correo y contraseña. El panel tiene un menú lateral contraíble
(barra de íconos en escritorio, menú deslizable en celular) y una barra superior con búsqueda,
cambio de tema, notificaciones y acceso al perfil.

### Resumen

- Sin módulo activo: aviso con un acceso directo para activar el primer módulo.
- Con módulo activo: nombre, periodo, avance del módulo, clase de hoy (cuántos marcaron), estadísticas
  generales y actividad reciente.
- Accesos rápidos a Estudiantes, Asistencias, Actividades y Nuevo módulo.
- **Guía rápida** de cuatro pasos que se marcan solos según el estado del sistema, y una **Guía de uso**
  con la explicación de cada función.

### Asistencias

- Matriz de estudiantes por fechas, con el estado de cada sesión.
- Filtros por fecha y búsqueda por nombre o número de registro; con una fecha seleccionada se muestra
  la vista de ese día con la hora de cada marca.
- Totales de presentes, atrasos y ausentes, y porcentaje. Los estudiantes en riesgo se resaltan.
- **Modificar asistencia:** clic en cualquier estado para cambiarlo, en cualquier fecha, incluso pasada.
  Sin puntualidad se elige Presente o Falta; con puntualidad, además Atraso y Justificado. Se puede
  escribir un motivo y el cambio queda auditado.
- **Exportar a Excel:** una hoja con la matriz completa (incluidos los campos adicionales y los
  totales por fecha) y una hoja de detalle con la hora y el origen de cada marca.

### Detalle de un estudiante

Se abre desde el nombre del estudiante en Asistencias, Estudiantes o la búsqueda. Muestra sus datos y
campos adicionales, la alerta de riesgo, el resumen y su historial completo. Desde ahí se puede
modificar cualquier sesión.

### Calendario

- El mismo calendario que ve el estudiante, con los datos del docente.
- **Compartir:** abre una ventana con vista previa de la imagen y opciones para WhatsApp, Correo,
  Facebook, Copiar imagen y Descargar. En celulares aparece además el menú nativo de compartir.
- **Descargar imagen** e **Imprimir**. La impresión sale en horizontal, con colores y sin el
  encabezado del navegador.
- **Reglas de asistencia** del módulo activo:
  - Puntualidad (activar o desactivar): minutos de apertura antes del inicio, tolerancia para Presente
    y límite para Atraso, con una línea de tiempo de ejemplo.
  - Puntuación y asistencia mínima: puntos por Presente, puntos por Atraso y porcentaje mínimo.

### Estudiantes

- Lista del módulo activo con búsqueda por nombre o número de registro, incluidas las columnas de
  campos adicionales.
- **Editar** los datos de un estudiante. Si se cambia el correo o el registro, el estudiante ingresa
  con el dato nuevo.
- **Agregar** un estudiante sin crear un módulo nuevo.
- **Dar de baja** y **Reincorporar.** La baja no borra nada: el estudiante no puede ingresar y no
  figura en las asistencias, pero sus registros se conservan. La opción "Ver dados de baja" los muestra.
- **Campos adicionales:** renombrar, cambiar la visibilidad (visible para el estudiante o solo
  administrador), agregar o quitar campos. Quitar un campo solo lo oculta; los valores no se borran.
- Toda alta, corrección, baja o reincorporación queda en Actividades, con los valores anteriores y nuevos.

### Actividades

Historial de acciones del módulo (ingresos, salidas, marcas, correcciones, exportaciones, cambios de
reglas, cambios de estudiantes, programación de módulos), con filtros por estudiante y por fecha, y
paginación.

### Módulos

- Historial de **todos los módulos**: activo, programado, finalizados y cancelados. Cada tarjeta muestra
  periodo, estudiantes, clases, porcentaje de asistencia, docente y fechas de activación y cierre.
- **Detalle de cualquier módulo** con pestañas Resumen, Asistencias, Estudiantes, Calendario y
  Actividades. Los módulos finalizados se muestran en **solo lectura**: no se puede modificar nada,
  pero se puede consultar, exportar a Excel y compartir el calendario.
- **Módulo programado:** cambiar la fecha de activación, activarlo de inmediato o cancelar la programación.

### Nuevo módulo

1. **Datos del módulo:** nombre, Excel de estudiantes, Excel de fechas y momento de activación:
   - **Ahora:** reemplaza al módulo activo en cuanto se confirma.
   - **Programar:** se elige fecha y hora. El módulo actual sigue funcionando hasta ese momento y luego
     el cambio es automático. Solo puede haber un módulo programado a la vez.
2. **Vista previa editable:**
   - Las filas con errores se muestran en rojo con la explicación de cada error.
   - Cada fila de estudiantes o fechas se puede corregir, quitar o agregar sin volver a subir el Excel.
   - Cada cambio se vuelve a validar en el servidor; los errores indican la fila de la tabla (columna #).
   - Opción "Mostrar solo filas con errores".
   - **Columnas extra:** si el Excel trae columnas además de las obligatorias (Teléfono, Carrera, CI...),
     se elige cuáles guardar, con qué nombre mostrarlas y si el estudiante puede verlas. Por privacidad,
     empiezan como "solo administrador".
3. **Confirmación:** antes de activar o programar, el sistema advierte qué módulo dejará de estar activo
   y que sus datos se conservan.

### Mi perfil (docente)

Grado académico, nombre completo, especialidad, teléfono, presentación y foto (JPG, PNG o WEBP de
hasta 2 MB). Estos datos aparecen en el calendario, en el panel del estudiante y en el menú lateral.
El correo es el usuario de ingreso y no se cambia desde aquí.

### Búsqueda y notificaciones

- **Búsqueda (Ctrl + K):** encuentra páginas y estudiantes por nombre o número de registro. Se navega
  con las flechas y se abre con Enter.
- **Notificaciones** (llegan en tiempo real):
  - cada marca de asistencia del día, con el estado y la hora, y un contador de no leídas;
  - la clase de hoy y cuántos marcaron;
  - estudiantes que faltaron cuando se cierra el registro;
  - estudiantes en riesgo;
  - módulo programado;
  - puntualidad desactivada;
  - ausencia de módulo activo.

---

## Funcionalidades generales

- **Modo oscuro:** opciones Sistema (sigue al sistema operativo y cambia en vivo), Claro y Oscuro. La
  elección se guarda en el navegador y se aplica antes de mostrar la página, sin destello claro. Al
  imprimir siempre se usa la paleta clara.
- **Diseño responsive:** todas las pantallas se adaptan a celular, tablet y escritorio.
- **Mensajes de confirmación y error** en todas las operaciones (RF-18).
- **Sesión:** si el token vence, el módulo cambia o el estudiante es dado de baja, la sesión se cierra
  y el login muestra el motivo.

---

## Cumplimiento del documento de requerimientos

| Código | Requerimiento | Implementación |
|---|---|---|
| RF-01 | Ingreso de estudiantes con correo o número de registro | Login, pestaña Estudiante; verifica que pertenezca al módulo activo y esté activo |
| RF-02 | Acceso del administrador con credenciales propias | Login, pestaña Administrador; rutas y API restringidas por rol; cierre de sesión |
| RF-03 | Registrar asistencia con un botón, fecha y hora reales, una vez por fecha | Botón Marcar asistencia; restricción única en base de datos |
| RF-04 | Identificación de faltas; solo el admin corrige fechas pasadas | Las faltas se calculan; el estudiante no puede marcar fechas pasadas |
| RF-05 | Historial personal con hora de marca y resumen | Inicio del estudiante (historial con filtros y resumen) |
| RF-06 | Lista de estudiantes con búsqueda | Estudiantes |
| RF-07 | Modificar asistencias con auditoría | Asistencias y detalle del estudiante; tabla `attendance_changes` |
| RF-08 | Vista general con filtros y totales | Asistencias |
| RF-09 | Registro de actividades | Tabla `activity_logs`; se registran todas las acciones importantes |
| RF-10 | Consulta de actividades con filtros | Actividades |
| RF-11 | Importar estudiantes con validación | Nuevo módulo (obligatorios, formato de correo, duplicados) |
| RF-12 | Importar fechas y horarios | Nuevo módulo (fechas válidas, horas válidas, sin repetidos) |
| RF-13 | Activar un nuevo módulo con confirmación, sin borrar datos | Nuevo módulo; transacción única |
| RF-14 | Persistencia en base de datos | PostgreSQL con migraciones |
| RF-15 | Conservación de módulos anteriores | Nada se borra; cada registro queda asociado a su módulo |
| RF-16 | Vista previa antes de activar (opcional) | Vista previa editable |
| RF-17 | Exportar asistencias a Excel (opcional) | Asistencias y detalle de módulos anteriores |
| RF-18 | Mensajes de confirmación y error (opcional) | Notificaciones emergentes en toda la aplicación |

Reglas de negocio RN-01 a RN-08: ver [Reglas de negocio](#reglas-de-negocio).

---

## Funcionalidades adicionales (fuera del documento)

Estas funciones no están en el documento o están en sus exclusiones. Se agregaron a pedido, cuidando
que el comportamiento por defecto siga cumpliendo el documento.

| Funcionalidad | Relación con el documento | Cómo se respeta |
|---|---|---|
| Reglas de puntualidad (Presente, Atraso, Falta por horario) | RF-12 dice "sin atrasos ni tolerancias" y las exclusiones dicen "ni calcular atrasos" | Vienen **desactivadas**; desactivadas, se marca todo el día y siempre es Presente |
| Marcar solo durante el horario de la clase | RF-12 dice que la marca se permite "durante todo el día de clase" | Viene **desactivada**; activada, cada clase se marca de su hora de inicio a su hora de fin, siempre como Presente |
| Estados Atraso y Justificado | No existen en el documento | Solo se pueden usar con la puntualidad activada |
| Puntos por sesión y asistencia mínima | No mencionados | Informativos; no cambian Presente ni Falta |
| Historial de módulos anteriores | RF-15 y las exclusiones dejan fuera la consulta de módulos anteriores | Solo lectura; no permite reactivar ni editar |
| Activación programada de módulos | No mencionada | El cambio de módulo sigue las mismas reglas de RF-13 y RN-01 |
| Edición de estudiantes y fechas en la vista previa | RF-11 y RF-12 hablan de importar | Lo editado se valida con las mismas reglas que el Excel |
| Altas, correcciones y bajas de estudiantes | No mencionadas | Auditadas; la baja no borra datos (RN-08) |
| Campos adicionales desde el Excel | RF-11 pide tres columnas | Las tres siguen siendo obligatorias; las extra son opcionales |
| Perfil del docente, calendario, compartir e imprimir | No mencionados | Solo informativos |
| Notificaciones, búsqueda, modo oscuro | No mencionados | Solo interfaz |

---

## Reglas de negocio

### Reglas del documento

| Código | Regla | Cómo se garantiza |
|---|---|---|
| RN-01 | Solo un módulo activo a la vez | Índice único parcial `modules(is_active) WHERE is_active` |
| RN-02 | Número de registro único en el módulo | Restricción única `(module_id, registration_number)`; validación en importación y edición |
| RN-03 | Una marca por estudiante y fecha | Restricción única `(student_id, session_id)` |
| RN-04 | Solo se marca el día de clase | El servidor busca la sesión del día en `APP_TZ`; la hora del navegador no cuenta |
| RN-05 | Sin marca al terminar el día, es Falta | La falta no se guarda: se calcula al consultar |
| RN-06 | Solo el admin modifica fechas pasadas | La marca del estudiante solo acepta la fecha actual |
| RN-07 | Toda modificación administrativa queda auditada | `attendance_changes` (valor anterior, nuevo, admin, fecha y motivo) y `activity_logs` |
| RN-08 | El reinicio no borra información | Activar o programar módulos y dar de baja estudiantes nunca elimina filas |

### Estados de una sesión

| Estado | Cuándo |
|---|---|
| Presente | El estudiante marcó (dentro de la tolerancia, si hay puntualidad) o el admin lo asignó |
| Atraso | Marcó después de la tolerancia y antes del límite (solo con puntualidad) |
| Falta | No marcó y la fecha ya pasó, se cerró el plazo de marca o el admin lo asignó |
| Justificado | Asignado por el admin (solo con puntualidad); no cuenta a favor ni en contra |
| Pendiente | Es hoy y todavía se puede marcar |
| Programada | Fecha futura |

### Marcar solo durante el horario de la clase (opcional)

Se activa en Calendario → Reglas, con la puntualidad desactivada, y viene apagada. Cada clase usa su
propio horario del Excel: con una clase de 18:00 a 21:00, antes de las 18:00 no se puede marcar, de
18:00 a 21:00 (inclusive) la marca es Presente, y desde las 21:01 ya no se puede marcar y la clase
queda como Falta. Apagada, se marca todo el día, como pide RF-12. Con la puntualidad activada, mandan
sus propios tramos.

### Reglas de puntualidad (opcionales)

Se configuran por módulo en Calendario y vienen desactivadas. Ejemplo con los valores por defecto y
una clase de 19:00 a 22:00:

| Marca | Resultado |
|---|---|
| Antes de las 18:45 | No se puede marcar ("Se habilita a las 18:45") |
| 18:45 a 19:20 (apertura de 15 min, tolerancia de 20 min) | Presente |
| 19:21 a 20:00 (límite de 60 min) | Atraso |
| Después de las 20:00 sin marca | Falta; ya no se puede marcar |

Los tramos se calculan desde la hora de inicio de cada clase y nunca pasan de la hora de fin. Cada
minuto límite es inclusivo. El bloqueo se aplica en el servidor, no solo en el botón.

### Puntos y porcentaje

- Presente vale los puntos configurados (por defecto 2), Atraso los suyos (por defecto 1) y Falta 0.
- Porcentaje de asistencia = (Presentes + Atrasos) / (Presentes + Atrasos + Faltas). Las sesiones
  justificadas no se cuentan.
- En riesgo: porcentaje menor al mínimo del módulo (por defecto 80 %).

### Estados de un módulo

| Estado | Significado |
|---|---|
| Activo | El módulo en uso; sus estudiantes pueden ingresar y marcar |
| Programado | Se activará automáticamente en la fecha y hora elegidas |
| Finalizado | Fue reemplazado; se consulta en solo lectura |
| Cancelado | Su programación se canceló antes de activarse |

Al finalizar un módulo, las sesiones anteriores al cierre sin marca cuentan como Falta y las
posteriores, que nunca se dictaron, quedan como Programada. Un módulo nuevo hereda las reglas de
asistencia del anterior.

---

## Formatos de Excel

Se lee la primera hoja. La fila de encabezados puede estar en cualquiera de las primeras 10 filas y los
encabezados se reconocen sin importar mayúsculas ni acentos.

### Estudiantes

| Número de registro | Nombre completo | Correo electrónico | (columnas extra opcionales) |
|---|---|---|---|
| 1001 | Juan Pérez | juan@gmail.com | ... |

- Encabezados reconocidos: "registro", "matrícula" o "código"; "nombre"; "correo" o "email".
- Validaciones: campos obligatorios, correo válido, registro y correo sin repetir, longitudes máximas.
- Cualquier otra columna con encabezado se ofrece como campo adicional (hasta 20).

### Fechas de clase

| Fecha | Hora inicio | Hora fin |
|---|---|---|
| 05/10/2026 | 18:00 | 21:00 |

- Fechas en formato DD/MM/AAAA, AAAA-MM-DD o fecha nativa de Excel; horas en HH:MM o en formato de hora de Excel.
- Validaciones: fecha y horas obligatorias y válidas, hora de fin posterior a la de inicio, fechas sin repetir.

---

## Arquitectura

### Backend: hexagonal por funcionalidad

```
backend/src/
├── database/               conexión, migraciones y DataSource del CLI
├── shared/                 kernel: errores de dominio, puerto Clock, reglas de asistencia,
│                           campos adicionales, guards de seguridad y filtro HTTP
└── modules/<feature>/
    ├── domain/             entidades, reglas puras y puertos (repositorios abstractos)
    ├── application/        casos de uso; solo dependen de puertos
    └── infrastructure/     adaptadores: TypeORM, Excel (exceljs) y HTTP (controllers y DTOs)
```

Funcionalidades: `auth`, `admins` (perfil y docente), `academic-modules` (módulo activo, importación,
historial, programación, reglas y campos adicionales), `students`, `class-sessions`, `attendance`,
`activity`.

Los puertos son clases abstractas que también sirven como token de inyección de Nest
(`{ provide: AttendanceRepository, useClass: TypeormAttendanceRepository }`).

Decisiones importantes:

- **El servidor decide qué día y hora es** (`Clock` con `APP_TZ`), nunca el navegador.
- **La activación programada** la hace `ScheduledActivationService`, que revisa cada 30 segundos y al
  arrancar el servidor; un servidor apagado en el momento programado activa el módulo apenas vuelve.
- **La vista previa** devuelve todas las filas, también las inválidas, para poder corregirlas. La
  activación recibe los datos ya corregidos en JSON y el servidor los vuelve a validar.
- **Tiempo real (WebSocket con Socket.IO):** corre en el mismo servidor y puerto, en `/api/socket.io`,
  y valida el mismo token JWT. Cada acción que pasa por `ActivityRecorder` (y los cambios del perfil
  del docente) envía un aviso `changed` que **no lleva datos**. El cliente (`RealtimeSync`) vuelve a
  consultar a la API lo que tiene en pantalla, así nadie recibe información que la API no le daría.
  Destinatarios: los administradores reciben todo. Una acción sobre un estudiante concreto le llega
  solo a él, y los cambios generales (clases, reglas) a todo el módulo. Activar un módulo avisa a
  todos, para cerrar la sesión de los estudiantes del anterior. Las imágenes solo se vuelven a
  descargar cuando cambia la foto del docente. Si la conexión se cae, se reconecta sola y se
  actualiza al volver; además se sigue consultando cada 30 segundos como respaldo.

### Frontend: Clean Architecture por funcionalidad

```
frontend/src/
├── app/                    composition root (inyecta adaptadores), router y layouts
├── core/                   cliente HTTP, almacenamiento del token, contexto de dependencias
├── shared/                 UI reutilizable (Button, Card, Chip, Modal, Toast, ThemeToggle,
│                           AppBackground...) y utilidades (formato, tema)
└── features/<feature>/
    ├── domain/             tipos e interfaces de repositorio
    ├── infrastructure/     implementación HTTP del repositorio
    ├── application/        hooks de React Query y contexto de autenticación
    └── presentation/       páginas y componentes
```

Funcionalidades: `auth`, `attendance`, `students`, `academic-modules`, `module-history`, `calendar`,
`profile`, `student-portal`, `activity`, `dashboard`.

Los colores están definidos como variables en `frontend/src/index.css`. El modo oscuro redefine esas
mismas variables, así que todos los componentes cambian sin modificarse uno por uno.

---

## Base de datos

```
admins ─┐
        └─< modules ─┬─< students ─────┐
                     ├─< class_sessions ┼─< attendances ─< attendance_changes
                     └─< activity_logs  ┘
```

| Tabla | Contenido |
|---|---|
| `admins` | Administradores y su perfil de docente (grado, teléfono, especialidad, presentación, foto) |
| `modules` | Módulos con estado, fechas de activación, cierre y programación, reglas de asistencia y definición de campos adicionales |
| `students` | Estudiantes por módulo, campos adicionales (JSONB) y estado activo o de baja |
| `class_sessions` | Fechas y horarios de clase por módulo |
| `attendances` | Marcas y correcciones (Presente, Atraso, Falta, Justificado); las faltas sin registro no se guardan |
| `attendance_changes` | Auditoría de cada corrección del administrador |
| `activity_logs` | Historial de actividades |

Migraciones (en `backend/src/database/migrations/`), aplicadas automáticamente al iniciar:

| Migración | Cambio |
|---|---|
| `1760400000000-initial-schema` | Esquema inicial |
| `1760500000000-attendance-rules-and-profile` | Reglas de puntualidad, estados Atraso y Justificado, perfil del docente |
| `1760600000000-attendance-scoring` | Puntos por estado y asistencia mínima |
| `1760700000000-module-scheduling` | Estados de módulo y activación programada |
| `1760800000000-student-editing-extra-fields` | Campos adicionales y baja de estudiantes |
| `1761300000000-class-hours-only` | Regla opcional para marcar solo durante el horario de la clase |

---

## API

Todas las rutas tienen el prefijo `/api` y, salvo el login, requieren `Authorization: Bearer <token>`.
Las rutas que aceptan `moduleId` consultan un módulo del historial; sin ese parámetro usan el activo.

### Autenticación

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/admin/login` | público | Ingreso del administrador (RF-02) |
| POST | `/auth/student/login` | público | Ingreso del estudiante con correo o registro (RF-01) |
| GET | `/auth/me` | ambos | Usuario de la sesión |
| POST | `/auth/logout` | ambos | Cierre de sesión (auditado) |

### Asistencia

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/attendance/me` | estudiante | Historial, resumen, ventana y cuenta regresiva de hoy (RF-05) |
| POST | `/attendance/mark` | estudiante | Marcar asistencia (RF-03) |
| GET | `/attendance?moduleId&sessionId&studentId&search` | admin | Vista general (RF-08) |
| PATCH | `/attendance` | admin | Modificar una asistencia (RF-07) |
| GET | `/attendance/export?moduleId` | admin | Exportar a Excel (RF-17) |
| GET | `/attendance/students/:studentId?moduleId` | admin | Detalle de un estudiante |

### Estudiantes y fechas

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/students?search&moduleId&includeInactive` | admin | Lista con búsqueda (RF-06) |
| POST | `/students` | admin | Agregar estudiante al módulo activo |
| PATCH | `/students/:id` | admin | Corregir datos |
| PATCH | `/students/:id/status` | admin | Dar de baja o reincorporar |
| GET | `/sessions?moduleId` | admin | Fechas de clase |

### Módulos

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/modules` | admin | Historial de módulos |
| GET | `/modules/active` | admin | Módulo activo con totales |
| GET | `/modules/:id` | admin | Detalle de un módulo |
| POST | `/modules/preview` | admin | Leer los Excel (multipart) y devolver la vista previa editable (RF-16) |
| POST | `/modules/validate` | admin | Revalidar la vista previa editada |
| POST | `/modules/activate` | admin | Activar o programar un módulo con los datos corregidos (RF-13) |
| PATCH | `/modules/active/rules` | admin | Reglas de puntualidad, puntos y mínimo |
| PATCH | `/modules/active/extra-fields` | admin | Campos adicionales |
| PATCH | `/modules/:id/schedule` | admin | Cambiar la fecha de un módulo programado |
| POST | `/modules/:id/activate-now` | admin | Activar ya un módulo programado |
| DELETE | `/modules/:id/schedule` | admin | Cancelar la programación |

### Actividades, perfil y docente

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/activity?moduleId&studentId&date&page&pageSize` | admin | Historial de actividades (RF-10) |
| GET / PUT | `/profile` | admin | Ver o actualizar el perfil del docente |
| GET / POST / DELETE | `/profile/photo` | admin | Ver, subir o quitar la foto |
| GET | `/teacher?moduleId` | ambos | Docente del módulo (el estudiante solo ve el de su módulo) |
| GET | `/teacher/photo?moduleId` | ambos | Foto del docente |

---

## Pruebas y calidad

| Dónde | Comando | Qué hace |
|---|---|---|
| backend | `npm test` | Pruebas unitarias de reglas de negocio (estados, puntualidad, cuenta regresiva, puntos, importación, campos adicionales) |
| backend | `npm run lint` | Análisis estático con oxlint |
| backend | `npm run migration:show` / `migration:run` / `migration:revert` | Migraciones con el CLI de TypeORM |
| frontend | `npm run build` | Verificación de tipos y build de producción |
| frontend | `npm run lint` | ESLint |

Los flujos de programación de módulos, historial, edición de la vista previa, campos adicionales y
gestión de estudiantes se probaron de punta a punta contra una base de datos temporal.

---

## Seguridad y consideraciones

- **Ingreso de estudiantes sin contraseña.** Lo pide RF-01, pero cualquiera que conozca el correo o el
  número de registro de otro estudiante puede ingresar y marcar por él. Mejoras posibles: pedir correo
  y registro juntos, un PIN por estudiante o un código de clase que entregue el docente.
- **Las reglas se validan en el servidor.** Horarios de marca, permisos por rol, estados permitidos y
  validaciones de datos se verifican en el backend; la interfaz solo las refleja.
- **Privacidad de los campos adicionales.** Los campos marcados como "solo administrador" no se envían
  al estudiante; el servidor los filtra.
- **Compartir en computadora.** Las páginas web no pueden adjuntar archivos a WhatsApp, Facebook o al
  correo: el sistema copia la imagen al portapapeles y abre el destino con el texto listo para pegarla.
  En celulares, el menú nativo sí adjunta la imagen.
- **Cambiar el correo o el registro** de un estudiante cambia el dato con el que ingresa.
- **Variables sensibles.** `backend/.env` no se versiona. Usa un `JWT_SECRET` largo y aleatorio y cambia
  la contraseña del administrador inicial en cualquier instalación real.
