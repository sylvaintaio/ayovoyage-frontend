import { formatDuration, localDate, toLocalInput, toRfc3339 } from './dates';

describe('dates', () => {
  it('calcule la date locale du Bénin', () => {
    // 23h30 UTC le 8 octobre = 00h30 le 9 octobre au Bénin
    expect(localDate(0, new Date('2026-10-08T23:30:00Z'))).toBe('2026-10-09');
    expect(localDate(1, new Date('2026-10-08T10:00:00Z'))).toBe('2026-10-09');
  });

  it('formate les durées', () => {
    expect(formatDuration(420)).toBe('7 h');
    expect(formatDuration(95)).toBe('1 h 35');
    expect(formatDuration(40)).toBe('40 min');
  });

  it('convertit les saisies date-heure', () => {
    expect(toRfc3339('2026-10-12T07:00')).toBe('2026-10-12T07:00:00+01:00');
    expect(toLocalInput('2026-10-12T06:00:00Z')).toBe('2026-10-12T07:00');
  });
});
