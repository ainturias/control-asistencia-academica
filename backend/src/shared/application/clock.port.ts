/** Puerto de tiempo: toda regla de "hoy" pasa por aquí (RN-04, RN-05). */
export abstract class Clock {
  abstract now(): Date;
  /** Fecha actual en la zona horaria de la aplicación, formato YYYY-MM-DD. */
  abstract today(): string;
  /** Convierte un instante a fecha local YYYY-MM-DD. */
  abstract toLocalDate(instant: Date): string;
  /** Hora actual en la zona horaria de la aplicación, formato HH:mm. */
  abstract currentTime(): string;
  /** Segundos transcurridos desde la medianoche local. */
  abstract secondsSinceMidnight(): number;
  abstract get timeZone(): string;
}
