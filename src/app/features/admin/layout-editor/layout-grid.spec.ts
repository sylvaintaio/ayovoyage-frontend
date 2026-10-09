import { generateCoach, key, renumber, validate } from './layout-grid';

describe('layout-grid', () => {
  it('génère un autocar 2+2 numéroté avec fenêtre et couloir', () => {
    const cells = generateCoach(13, 2, 2, 'std');
    const seats = [...cells.values()].filter((c) => c.kind === 'seat');
    expect(seats.length).toBe(48);
    expect(cells.get(key(0, 0))?.kind).toBe('driver');
    expect(cells.get(key(1, 0))).toMatchObject({ seat_label: '1A', attributes: ['window'] });
    expect(cells.get(key(1, 1))).toMatchObject({ seat_label: '1B', attributes: ['aisle'] });
    expect(cells.get(key(1, 3))).toMatchObject({ seat_label: '1C', attributes: ['aisle'] });
    expect(cells.get(key(12, 4))?.seat_label).toBe('12D');
    expect(validate(cells)).toEqual([]);
  });

  it('conserve les attributs manuels à la renumérotation', () => {
    const cells = generateCoach(2, 2, 2, 'std');
    cells.set(key(1, 0), { ...cells.get(key(1, 0))!, attributes: ['accessible'] });
    expect(renumber(cells).get(key(1, 0))?.attributes).toEqual(['window', 'accessible']);
  });

  it('détecte les numéros en double et les catégories manquantes', () => {
    const cells = generateCoach(2, 1, 1, 'std');
    cells.set(key(1, 2), { ...cells.get(key(1, 2))!, seat_label: '1A', category_id: undefined });
    expect(validate(cells)).toEqual(expect.arrayContaining(['Numéro en double : 1A', 'Siège 1A sans catégorie']));
  });
});
