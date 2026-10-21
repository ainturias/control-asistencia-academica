/**
 * Aviso en tiempo real de que algo cambió. No lleva datos: el cliente vuelve a consultar lo que
 * tiene en pantalla, así cada uno sigue viendo solo lo que la API le permite.
 */
export interface RealtimeEvent {
  /** Acción que provocó el cambio (por ejemplo MARK_ATTENDANCE), útil para depurar. */
  action: string;
  /** true si cambió una imagen (foto del docente) y el cliente debe volver a descargarla. */
  images?: boolean;
}

/** Puerto de eventos en tiempo real (WebSocket). Un fallo aquí nunca rompe la acción principal. */
export abstract class RealtimeEvents {
  /** A todos los administradores conectados. */
  abstract toAdmins(event: RealtimeEvent): void;
  /** A todos los estudiantes conectados de un módulo. */
  abstract toModuleStudents(moduleId: number, event: RealtimeEvent): void;
  /** A un estudiante (todas sus pestañas o dispositivos). */
  abstract toStudent(studentId: number, event: RealtimeEvent): void;
  /** A todos los conectados, de cualquier rol y módulo. */
  abstract toEveryone(event: RealtimeEvent): void;
}
