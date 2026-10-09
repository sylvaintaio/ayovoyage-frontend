import { ApiUrlPipe } from './api-url.pipe';

describe('ApiUrlPipe', () => {
  it('préfixe le chemin par l’adresse de l’API', () => {
    expect(new ApiUrlPipe().transform('/v1/tickets/42/pdf')).toBe('/api/v1/tickets/42/pdf');
  });
});
