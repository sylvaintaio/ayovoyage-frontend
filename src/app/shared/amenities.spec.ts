import { amenity } from './amenities';

describe('amenity', () => {
  it('traduit les équipements connus', () => {
    expect(amenity('wifi')).toEqual({ label: 'Wi-Fi', icon: 'wifi' });
    expect(amenity(' USB ')).toEqual({ label: 'Prises USB', icon: 'plug' });
  });

  it('met une majuscule aux équipements inconnus', () => {
    expect(amenity('télévision').label).toBe('Télévision');
  });
});
