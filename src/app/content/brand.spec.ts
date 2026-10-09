import { brandTitle } from '../core/layout/brand-title.strategy';
import { BRAND, brandInitials, brandSlug } from './brand';

describe('brand', () => {
  it('déduit les initiales du logo et le nom de fichier', () => {
    expect(brandInitials('BUS-VOYAGE')).toBe('BV');
    expect(brandInitials('Trans Express')).toBe('TE');
    expect(brandInitials('Ébène')).toBe('ÉB');
    expect(brandSlug('Bénin Bus & Co')).toBe('benin-bus-co');
  });

  it('ajoute le nom de la marque aux titres des pages', () => {
    expect(brandTitle('Mes billets', '/compte/billets')).toBe(`Mes billets — ${BRAND.name}`);
    expect(brandTitle('Départs', '/admin/departs')).toBe(`Départs — Back-office ${BRAND.name}`);
    expect(brandTitle(undefined)).toBe(`${BRAND.name} — ${BRAND.tagline}`);
  });
});
