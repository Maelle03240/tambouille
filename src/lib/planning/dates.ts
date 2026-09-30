/** Dates du planning (semaines du lundi au dimanche, en heure locale). */

const pad = (n: number) => String(n).padStart(2, "0");

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseDay(iso);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

/** Lundi de la semaine contenant ce jour. */
export function weekStart(iso: string): string {
  const d = parseDay(iso);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  return addDays(iso, -dow);
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const today = () => isoDay(new Date());

const LONG = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const SHORT_DAY = ["L", "M", "M", "J", "V", "S", "D"];

/** « Lundi 5 octobre » */
export function longLabel(iso: string) {
  const s = LONG.format(parseDay(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortLetter(iso: string) {
  return SHORT_DAY[(parseDay(iso).getDay() + 6) % 7];
}

/** « 5 – 11 octobre » */
export function weekLabel(monday: string) {
  const a = parseDay(monday);
  const b = parseDay(addDays(monday, 6));
  const month = (d: Date) => d.toLocaleDateString("fr-FR", { month: "long" });
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${month(b)}`
    : `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)}`;
}
