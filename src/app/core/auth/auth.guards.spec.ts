import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { customerGuard, staffGuard } from './auth.guards';
import { AuthStore } from './auth.store';

describe('gardes de routes', () => {
  let auth: AuthStore;
  const state = { url: '/compte/reservations' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    auth = TestBed.inject(AuthStore);
  });

  const run = (guard: typeof customerGuard, data: Record<string, unknown> = {}) =>
    TestBed.runInInjectionContext(() => guard({ data } as unknown as ActivatedRouteSnapshot, state));

  it('redirige un visiteur vers la connexion client avec l’URL de retour', () => {
    const res = run(customerGuard) as UrlTree;
    expect(res.toString()).toBe('/connexion?retour=%2Fcompte%2Freservations');
  });

  it('laisse passer un client connecté', () => {
    auth.me.set({ type: 'customer', customer: { id: '1', phone: '+229', full_name: 'A', referral_code: 'X', created_at: '' } });
    expect(run(customerGuard)).toBe(true);
  });

  it('refuse un rôle non autorisé au back-office', () => {
    auth.me.set({ type: 'staff', staff: { id: '1', company_id: 'c', email: 'e', full_name: 'C', phone: '', role: 'cashier' } });
    expect(run(staffGuard, { roles: ['cashier'] })).toBe(true);
    expect((run(staffGuard, { roles: ['company_admin'] }) as UrlTree).toString()).toBe('/admin');
  });
});
