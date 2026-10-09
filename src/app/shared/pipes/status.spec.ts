import { statusInfo } from './status';

describe('statusInfo', () => {
  it('traduit un statut connu', () => {
    expect(statusInfo('booking', 'confirmed')).toEqual({ label: 'Confirmée', tone: 'success' });
  });

  it('renvoie le code brut pour un statut inconnu', () => {
    expect(statusInfo('booking', 'mystery').label).toBe('mystery');
  });
});
