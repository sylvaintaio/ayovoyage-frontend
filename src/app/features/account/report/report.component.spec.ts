import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { ReportComponent } from './report.component';

async function setup(colis?: string) {
  await TestBed.configureTestingModule({
    imports: [ReportComponent],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
  }).compileComponents();
  TestBed.inject(AuthStore).me.set({
    type: 'customer',
    customer: { id: 'c', full_name: 'Awa Dossou', phone: '+2290197000010', referral_code: 'X', created_at: '' },
  } as never);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ReportComponent);
  if (colis) {
    fixture.componentRef.setInput('colis', colis);
  }
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne((r) => r.url === '/api/v1/bookings').flush([
    { id: 'b1', reference: 'BV123', status: 'confirmed', route_name: 'Cotonou → Parakou', departure_at: '2026-10-09T06:00:00Z', company_name: 'Trans' },
    { id: 'b2', reference: 'BV999', status: 'expired', route_name: 'Cotonou → Bohicon', departure_at: '2026-10-01T06:00:00Z', company_name: 'Trans' },
  ]);
  http.expectOne('/api/v1/me/parcels').flush([]);
  await settle(fixture);
  return { fixture, http, el: fixture.nativeElement as HTMLElement, navigate, navigateByUrl };
}

describe('ReportComponent', () => {
  it('propose les réservations du client pour un problème de voyage', async () => {
    const { fixture, el, navigate } = await setup();
    (el.querySelectorAll('.choice')[0] as HTMLButtonElement).click();
    await settle(fixture);
    const rows = el.querySelectorAll('.row');
    expect(rows.length).toBe(1); // les réservations expirées ne sont pas proposées
    (rows[0] as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith(['/compte/reclamations/nouvelle'], { queryParams: { reservation: 'b1' } });
  });

  it('ouvre directement le formulaire colis depuis le suivi, téléphone prérempli', async () => {
    const { fixture, http, el, navigateByUrl } = await setup('clx865cuzw');
    expect((el.querySelector('#rp-trk') as HTMLInputElement).value).toBe('CLX865CUZW');
    expect((el.querySelector('#rp-ph') as HTMLInputElement).value).toBe('+2290197000010');
    const desc = el.querySelector('#rp-desc') as HTMLTextAreaElement;
    desc.value = 'Le colis n’est toujours pas arrivé.';
    desc.dispatchEvent(new Event('input'));
    await settle(fixture);
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne('/api/v1/public/parcels/CLX865CUZW/incidents');
    expect(req.request.body).toMatchObject({ phone: '+2290197000010', name: 'Awa Dossou', category: 'delayed' });
    req.flush({ reference: 'RC-ABC123', status: 'open' });
    await settle(fixture);
    expect(navigateByUrl).toHaveBeenCalledWith('/compte/reclamations');
  });
});
