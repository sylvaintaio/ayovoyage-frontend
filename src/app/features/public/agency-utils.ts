import { OpeningHours } from '../../api/models';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Lien d'itinéraire vers l'agence (application de cartes du téléphone). */
export function mapsUrl(lat?: number, lng?: number, label = ''): string | null {
  if (lat === undefined || lng === undefined) {
    return null;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(label)}`;
}

/** Horaires du jour, heure du Bénin : « 05:30 – 21:00 » ou « Fermé aujourd'hui ». */
export function todayHours(hours: OpeningHours[] | null | undefined, now: Date = new Date()): string {
  const day = DAYS[new Date(now.getTime() + 3_600_000).getUTCDay()];
  const h = (hours ?? []).find((x) => x.day === day);
  return h ? `${h.open} – ${h.close}` : "Fermé aujourd'hui";
}

/** Lien WhatsApp (numéro E.164 sans « + »). */
export function whatsappUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}
