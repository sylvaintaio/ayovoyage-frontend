import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { CustomerLoginComponent, formatE164, formatLocalPhone } from './customer-login.component';

describe('formatage du téléphone', () => {
  it('groupe les chiffres par deux', () => {
    expect(formatLocalPhone('0197000001')).toBe('01 97 00 00 01');
    expect(formatE164('+2290197000001')).toBe('+229 01 97 00 00 01');
  });
});

describe('CustomerLoginComponent', () => {
  async function setup(channels: string[] = ['email', 'sms']) {
    await TestBed.configureTestingModule({
      imports: [CustomerLoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(CustomerLoginComponent);
    fixture.componentRef.setInput('retour', undefined);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/public/auth-options').flush({ channels });
    await settle(fixture, 5);
    return { fixture, el: fixture.nativeElement as HTMLElement, http };
  }

  function type(el: HTMLElement, selector: string, value: string) {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function sendEmailCode(ctx: Awaited<ReturnType<typeof setup>>) {
    type(ctx.el, '#login-email', 'Mariam@Exemple.bj');
    await settle(ctx.fixture, 5);
    ctx.el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = ctx.http.expectOne('/api/v1/auth/otp/request');
    expect(req.request.body).toEqual({ email: 'Mariam@Exemple.bj' });
    req.flush({ channel: 'email', destination: 'mariam@exemple.bj', expires_in: 300, dev_code: '123456' });
    await settle(ctx.fixture, 5);
  }

  function paste(el: HTMLElement, code: string) {
    const ev = new Event('paste') as ClipboardEvent;
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => code } });
    el.querySelector('bv-otp-input input')!.dispatchEvent(ev);
  }

  it('propose l’e-mail par défaut et affiche les 6 cases du code', async () => {
    const ctx = await setup();
    expect(ctx.el.querySelector('#login-email')).toBeTruthy();
    await sendEmailCode(ctx);
    expect(ctx.el.querySelectorAll('bv-otp-input input').length).toBe(6);
    expect(ctx.el.textContent).toContain('mariam@exemple.bj');
    expect(ctx.el.textContent).toContain('Nouvel envoi possible dans');
  });

  it('masque le choix du canal quand seul l’e-mail est actif', async () => {
    const ctx = await setup(['email']);
    expect(ctx.el.querySelector('.switch')).toBeNull();
  });

  it('bascule vers le SMS et formate le numéro', async () => {
    const ctx = await setup();
    (ctx.el.querySelectorAll('.switch button')[1] as HTMLButtonElement).click();
    await settle(ctx.fixture, 5);
    type(ctx.el, '#login-phone', '0197000001');
    await settle(ctx.fixture, 5);
    expect((ctx.el.querySelector('#login-phone') as HTMLInputElement).value).toBe('01 97 00 00 01');
  });

  it('demande le nom après la création d’un compte, puis redirige', async () => {
    const ctx = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await sendEmailCode(ctx);
    paste(ctx.el, '123456');
    const verify = ctx.http.expectOne('/api/v1/auth/otp/verify');
    expect(verify.request.body).toEqual(expect.objectContaining({ email: 'mariam@exemple.bj', code: '123456' }));
    verify.flush({ subject_type: 'customer', subject_id: 'c', is_new_account: true, access_expires_at: '', refresh_expires_at: '' });
    await settle(ctx.fixture, 5);
    ctx.http.expectOne('/api/v1/me').flush({ type: 'customer', customer: { id: 'c', email: 'mariam@exemple.bj', full_name: '', referral_code: 'X', created_at: '' } });
    await settle(ctx.fixture, 5);
    expect(ctx.el.textContent).toContain('Bienvenue à bord');

    type(ctx.el, '#login-name', 'Mariam Adjovi');
    await settle(ctx.fixture, 5);
    ctx.el.querySelector('form')!.dispatchEvent(new Event('submit'));
    ctx.http.expectOne((r) => r.method === 'PUT' && r.url === '/api/v1/me').flush({
      type: 'customer', customer: { id: 'c', email: 'mariam@exemple.bj', full_name: 'Mariam Adjovi', referral_code: 'X', created_at: '' },
    });
    await settle(ctx.fixture, 5);
    expect(navigate).toHaveBeenCalledWith('/compte');
  });

  it('signale un code erroné et vide les cases', async () => {
    const ctx = await setup();
    await sendEmailCode(ctx);
    paste(ctx.el, '000000');
    ctx.http.expectOne('/api/v1/auth/otp/verify').flush({ status: 400, detail: 'Code invalide ou expiré' }, { status: 400, statusText: 'Bad Request' });
    await settle(ctx.fixture, 5);
    expect(ctx.el.textContent).toContain('Code invalide ou expiré');
    expect(ctx.el.querySelector('.otp__box--invalid')).toBeTruthy();
  });
});
