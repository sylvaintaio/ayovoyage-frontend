import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { CollectComponent } from './collect.component';

const booking = (id: string, minutes: number) => ({
  id, reference: 'BV' + id, status: 'pending', payment_mode: 'agency', contact_name: 'Awa', contact_phone: '+22997000000',
  total_amount: 7500, currency: 'XOF', route_name: 'Cotonou → Parakou', departure_at: '2026-10-12T06:00:00Z',
  expires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
});

describe('CollectComponent', () => {
  it('liste les réservations à payer en agence, les plus urgentes d’abord, et cherche par téléphone', async () => {
    await TestBed.configureTestingModule({
      imports: [CollectComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(CollectComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const first = http.expectOne((r) => r.url === '/api/v1/admin/bookings');
    expect(first.request.params.get('payment_mode')).toBe('agency');
    expect(first.request.params.get('status')).toBe('pending');
    first.flush([booking('LATER', 600), booking('SOON', 60), booking('GONE', -5)]);
    await settle(fixture);

    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLElement[];
    expect(rows.map((r) => r.querySelector('a')!.textContent!.trim())).toEqual(['BVSOON', 'BVLATER']);
    expect(rows[0].querySelector('.urgent')).toBeTruthy();

    fixture.componentInstance['q'].set('97 00 00 00');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    const search = http.expectOne((r) => r.url === '/api/v1/admin/bookings');
    expect(search.request.params.get('q')).toBe('97 00 00 00');
    expect(search.request.params.has('payment_mode')).toBe(false);
  });
});
