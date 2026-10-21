import type { CellValue } from 'exceljs';

export type CellPrimitive = string | number | boolean | Date | null;

/** Reduce cualquier valor de celda de exceljs (fórmula, hipervínculo, texto enriquecido) a un primitivo. */
export function toPrimitive(value: CellValue): CellPrimitive {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value !== 'object') return value;
  if ('result' in value) return toPrimitive(value.result as CellValue);
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('text' in value) return toPrimitive(value.text as CellValue);
  return null;
}

export function toText(value: CellPrimitive): string {
  if (value === null) return '';
  if (value instanceof Date) {
    if (value.getUTCFullYear() <= 1900) return formatTime(value.getUTCHours(), value.getUTCMinutes());
    return `${pad(value.getUTCDate())}/${pad(value.getUTCMonth() + 1)}/${value.getUTCFullYear()}`;
  }
  return String(value).trim();
}

export function normalizeHeader(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Devuelve YYYY-MM-DD o null. Acepta fecha nativa, serial de Excel, DD/MM/AAAA y AAAA-MM-DD. */
export function parseDate(value: CellPrimitive): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return ymd(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === 'number') {
    if (value < 1 || value > 2958465) return null;
    const date = new Date(Math.round((Math.floor(value) - 25569) * 86_400_000));
    return ymd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  if (typeof value === 'string') {
    const text = value.trim();
    let match = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(text);
    if (match) return ymd(Number(match[3]), Number(match[2]), Number(match[1]));
    match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
    if (match) return ymd(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return null;
}

/** Devuelve HH:mm o null. Acepta hora nativa, fracción de día de Excel, "18:00", "6:00 pm" y enteros 0-23. */
export function parseTime(value: CellPrimitive): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const totalMinutes = Math.round(
      (value.getUTCHours() * 3600 + value.getUTCMinutes() * 60 + value.getUTCSeconds()) / 60,
    );
    return fromMinutes(totalMinutes);
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 0 && value <= 23) return formatTime(value, 0);
    const fraction = value - Math.floor(value);
    return fromMinutes(Math.round(fraction * 1440));
  }
  if (typeof value === 'string') {
    const match = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])?\.?\s*m?\.?$/i.exec(value.trim());
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2] ?? 0);
    const meridiem = match[3]?.toLowerCase();
    if (meridiem) {
      if (hours < 1 || hours > 12) return null;
      if (meridiem === 'p' && hours !== 12) hours += 12;
      if (meridiem === 'a' && hours === 12) hours = 0;
    }
    if (!match[2] && !meridiem) return null;
    if (hours > 23 || minutes > 59) return null;
    return formatTime(hours, minutes);
  }
  return null;
}

function fromMinutes(totalMinutes: number): string | null {
  if (totalMinutes < 0 || totalMinutes >= 1440) return null;
  return formatTime(Math.floor(totalMinutes / 60), totalMinutes % 60);
}

function ymd(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    year < 2000 ||
    year > 2100
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function formatTime(hours: number, minutes: number): string {
  return `${pad(hours)}:${pad(minutes)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
