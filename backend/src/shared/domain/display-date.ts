/** YYYY-MM-DD → DD/MM/AAAA, para textos legibles del historial. */
export function toDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
