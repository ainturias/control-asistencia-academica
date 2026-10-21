import { BusinessRuleError } from './errors';

/** Campo adicional de los estudiantes de un módulo (columna extra del Excel). */
export interface ExtraField {
  /** Clave estable con la que se guarda el valor en cada estudiante. */
  key: string;
  /** Nombre que se muestra. */
  label: string;
  /** Si el estudiante lo ve en su perfil; si no, solo lo ve el administrador. */
  visibleToStudent: boolean;
}

export type ExtraValues = Record<string, string>;

export const MAX_EXTRA_FIELDS = 20;
export const MAX_EXTRA_VALUE_LENGTH = 300;
const KEY_PATTERN = /^[a-z0-9_]{1,40}$/;

/** "Teléfono celular" → "telefono_celular" */
export function extraFieldKey(header: string): string {
  return (
    header
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'campo'
  );
}

/** Limpia y valida la definición de campos; descarta claves repetidas. */
export function normalizeExtraFields(fields: ExtraField[]): ExtraField[] {
  if (fields.length > MAX_EXTRA_FIELDS) {
    throw new BusinessRuleError(`Se permiten como máximo ${MAX_EXTRA_FIELDS} campos adicionales`);
  }
  const seen = new Set<string>();
  const result: ExtraField[] = [];
  for (const field of fields) {
    const label = field.label.replace(/\s+/g, ' ').trim();
    if (!KEY_PATTERN.test(field.key)) throw new BusinessRuleError(`Clave de campo inválida: ${field.key}`);
    if (!label || label.length > 60) {
      throw new BusinessRuleError('Cada campo adicional necesita un nombre de hasta 60 caracteres');
    }
    if (seen.has(field.key)) continue;
    seen.add(field.key);
    result.push({ key: field.key, label, visibleToStudent: field.visibleToStudent });
  }
  return result;
}

/** Deja solo los valores de los campos definidos, recortados y sin vacíos. */
export function pickExtraValues(values: ExtraValues | undefined, fields: ExtraField[]): ExtraValues {
  const result: ExtraValues = {};
  for (const field of fields) {
    const value = values?.[field.key]?.toString().replace(/\s+/g, ' ').trim();
    if (value) result[field.key] = value.slice(0, MAX_EXTRA_VALUE_LENGTH);
  }
  return result;
}
