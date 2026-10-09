import { mapsUrl, todayHours, whatsappUrl } from './agency-utils';

describe('agency-utils', () => {
  it('construit un lien d’itinéraire', () => {
    expect(mapsUrl(6.36, 2.41)).toContain('destination=6.36,2.41');
    expect(mapsUrl(undefined, 2)).toBeNull();
  });

  it('donne les horaires du jour à l’heure du Bénin', () => {
    const hours = [{ day: 'mon' as const, open: '05:30', close: '21:00' }];
    // Lundi 12 octobre 2026, 10h UTC
    expect(todayHours(hours, new Date('2026-10-12T10:00:00Z'))).toBe('05:30 – 21:00');
    expect(todayHours(hours, new Date('2026-10-13T10:00:00Z'))).toBe("Fermé aujourd'hui");
  });

  it('construit un lien WhatsApp', () => {
    expect(whatsappUrl('+229 01 00 00 00 01')).toBe('https://wa.me/2290100000001');
  });
});
