import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { ReferralComponent } from './referral.component';

describe('ReferralComponent', () => {
  it('affiche le code à partager et permet de saisir celui d’un parrain', async () => {
    await TestBed.configureTestingModule({
      imports: [ReferralComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReferralComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/me/referral').flush({
      code: 'K7M3Q2X', share_url: 'https://exemple.bj/connexion?parrain=K7M3Q2X', referee_reward: 1000, referrer_points: 200,
      can_enter_code: true, welcome_available: false, friends: [{ first_name: 'Awa', status: 'rewarded', created_at: '2026-10-01T10:00:00Z' }],
    });
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.code')!.textContent).toContain('K7M3Q2X');
    expect(el.querySelector<HTMLAnchorElement>('a[href^="https://wa.me/"]')!.href).toContain('parrain%3DK7M3Q2X');
    expect(el.textContent).toContain('Points gagnés');

    fixture.componentInstance['code'].set('AB12CD');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/me/referral');
    expect(req.request.body).toEqual({ code: 'AB12CD' });
  });
});
