import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AdminLoginComponent } from './admin-login.component';

describe('AdminLoginComponent', () => {
  it('affiche le message d’erreur de l’API', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminLoginComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    for (const [id, value] of [['#al-email', 'admin@demo.local'], ['#al-password', 'mauvais-mdp']]) {
      const input = el.querySelector(id) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/staff/login')
      .flush({ status: 401, detail: 'E-mail ou mot de passe incorrect' }, { status: 401, statusText: 'Unauthorized' });
    await settle(fixture);
    expect(el.textContent).toContain('E-mail ou mot de passe incorrect');
  });

  it('redirige vers le tableau de bord sans paramètre « retour »', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminLoginComponent);
    // Comme le routeur quand le paramètre est absent de l'URL.
    fixture.componentRef.setInput('retour', undefined);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    for (const [id, value] of [['#al-email', 'admin@demo.local'], ['#al-password', 'Demo-Password-2026']]) {
      const input = el.querySelector(id) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/auth/staff/login').flush({ session: { subject_type: 'staff', subject_id: 's', access_expires_at: '', refresh_expires_at: '' } });
    await settle(fixture);
    http.expectOne('/api/v1/me').flush({ type: 'staff', staff: { id: 's', company_id: 'c', email: '', full_name: 'A', phone: '', role: 'company_admin' } });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith('/admin');
  });

  it('demande le code de double authentification avant d’ouvrir la session', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminLoginComponent);
    fixture.componentRef.setInput('retour', undefined);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    for (const [id, value] of [['#al-email', 'admin@demo.local'], ['#al-password', 'Demo-Password-2026']]) {
      const input = el.querySelector(id) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/auth/staff/login').flush({ mfa_step: 'verify', mfa_token: 'etape', mfa_expires_at: '' });
    await settle(fixture);
    expect(el.textContent).toContain('Vérification en deux étapes');
    http.expectNone('/api/v1/me');

    // Code de secours
    (el.querySelector('.alt .link') as HTMLButtonElement).click();
    await settle(fixture);
    const rc = el.querySelector('#al-recovery') as HTMLInputElement;
    rc.value = 'abcd-efgh';
    rc.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne('/api/v1/auth/staff/mfa/verify');
    expect(req.request.body).toEqual({ mfa_token: 'etape', recovery_code: 'abcd-efgh' });
    req.flush({ subject_type: 'staff', subject_id: 's', access_expires_at: '', refresh_expires_at: '' });
    await settle(fixture);
    http.expectOne('/api/v1/me').flush({ type: 'staff', staff: { id: 's', company_id: 'c', email: '', full_name: 'A', phone: '', role: 'company_admin' } });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith('/admin');
  });
});
