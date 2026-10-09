/** Fuseau d'affichage : Bénin (UTC+1, sans heure d'été). */
const OFFSET_MS = 60 * 60 * 1000;

/** Date du jour (ou décalée de `days`) au format AAAA-MM-JJ, heure du Bénin. */
export function localDate(days = 0, from: Date = new Date()): string {
  const d = new Date(from.getTime() + OFFSET_MS + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Durée lisible : 420 → « 7 h », 95 → « 1 h 35 ». */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) {
    return `${m} min`;
  }
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Convertit une saisie « datetime-local » (heure du Bénin) en RFC 3339. */
export function toRfc3339(local: string): string {
  return `${local.length === 16 ? local + ':00' : local}+01:00`;
}

/** Convertit une date RFC 3339 en valeur pour un champ « datetime-local » (heure du Bénin). */
export function toLocalInput(iso: string): string {
  return new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 16);
}
