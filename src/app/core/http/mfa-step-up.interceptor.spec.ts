import { Dialog } from '@angular/cdk/dialog';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { mfaStepUpInterceptor } from './http.interceptors';

describe('mfaStepUpInterceptor', () => {
  function setup(confirmed: boolean) {
    const open = vi.fn().mockReturnValue({ closed: of(confirmed) });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mfaStepUpInterceptor])),
        provideHttpClientTesting(),
        { provide: Dialog, useValue: { open } },
      ],
    });
    return { http: TestBed.inject(HttpClient), ctrl: TestBed.inject(HttpTestingController), open };
  }

  it('demande le code puis rejoue l’action sensible', async () => {
    const { http, ctrl, open } = setup(true);
    const res = firstValueFrom(http.put('/api/v1/admin/company', {}));
    ctrl.expectOne('/api/v1/admin/company').flush(
      { detail: 'Confirmez votre identité' },
      { status: 403, statusText: 'Forbidden', headers: { 'X-MFA-Required': 'step-up' } },
    );
    await new Promise((r) => setTimeout(r));
    ctrl.expectOne('/api/v1/admin/company').flush({ ok: true });
    expect(await res).toEqual({ ok: true });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('laisse passer un 403 ordinaire sans ouvrir de fenêtre', async () => {
    const { http, ctrl, open } = setup(true);
    const res = firstValueFrom(http.get('/api/v1/admin/staff')).catch((e) => e.status);
    ctrl.expectOne('/api/v1/admin/staff').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(await res).toBe(403);
    expect(open).not.toHaveBeenCalled();
  });
});
