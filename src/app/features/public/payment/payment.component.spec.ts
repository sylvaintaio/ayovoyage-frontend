import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideRouter } from '@angular/router';

import { provideApiConfiguration } from '../../../api/api-configuration';
import { PaymentComponent } from './payment.component';

describe('PaymentComponent', () => {
  it('affiche le récapitulatif et les moyens de paiement', async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(PaymentComponent);
    fixture.componentRef.setInput('id', 'b1');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/bookings/b1').flush({
      id: 'b1', reference: 'BV123', status: 'pending', total_amount: 25000, subtotal_amount: 25000, discount_amount: 0,
      loyalty_points_used: 0, loyalty_points_amount: 0, currency: 'XOF', contact_name: 'Awa', contact_phone: '+229',
      company_id: 'c', channel: 'web', created_at: '', expires_at: new Date(Date.now() + 600_000).toISOString(),
      departure: { id: 'd', departure_at: '2026-10-12T06:00:00Z', arrival_eta: '', status: 'scheduled', route_name: '',
        origin_city: 'Cotonou', origin_agency_name: 'Jonquet', destination_city: 'Parakou', company_name: '', included_baggage_kg: 20 },
      seats: [{ seat_id: 's', seat_label: '1A', category_code: 'vip', category_name: 'VIP', passenger_name: 'Awa',
        base_price: 7500, category_surcharge: 5000, seat_surcharge: 0, discount_amount: 0, total_price: 12500, status: 'held' }],
      tickets: [], payments: [],
    });
    http.expectOne('/api/v1/public/payment-providers').flush([{ code: 'mock', label: 'Paiement simulé', methods: ['mobile_money'] }]);
    await settle(fixture);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('BV123');
    expect(text).toContain('Paiement simulé');
  });

  it('propose de payer plus tard en agence et bloque les places', async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(PaymentComponent);
    fixture.componentRef.setInput('id', 'b1');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/bookings/b1').flush({
      id: 'b1', reference: 'BV123', status: 'pending', payment_mode: 'online', total_amount: 7500, subtotal_amount: 7500,
      discount_amount: 0, loyalty_points_used: 0, loyalty_points_amount: 0, currency: 'XOF', contact_name: 'Awa',
      contact_phone: '+229', company_id: 'c', channel: 'web', created_at: '', change_count: 0, change_fee_amount: 0,
      change_credit_amount: 0, expires_at: new Date(Date.now() + 600_000).toISOString(),
      departure: { id: 'd', departure_at: '2026-10-12T06:00:00Z', arrival_eta: '', status: 'scheduled', route_name: '',
        origin_city: 'Cotonou', origin_agency_name: 'Jonquet', destination_city: 'Parakou', company_name: '', included_baggage_kg: 20 },
      seats: [], tickets: [], payments: [],
    });
    http.expectOne('/api/v1/public/payment-providers').flush([{ code: 'mock', label: 'Paiement simulé', methods: ['mobile_money'] }]);
    await settle(fixture);
    http.expectOne((r) => r.method === 'GET' && r.url === '/api/v1/bookings/b1/pay-later').flush({
      enabled: true, available: true, amount: 7500, pay_by: '2026-10-11T18:00:00+01:00',
      agencies: [{ id: 'a', name: 'Cotonou — Jonquet', city: 'Cotonou', address: 'Rue 112' }],
    });
    await settle(fixture);

    const el: HTMLElement = fixture.nativeElement;
    const later = el.querySelector('section.later')!;
    expect(later.textContent).toContain('Cotonou — Jonquet');
    expect(later.textContent).not.toContain('Cotonou — Cotonou');
    later.querySelector<HTMLButtonElement>('button')!.click();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/bookings/b1/pay-later');
    req.flush({ id: 'b1', pay_by: '2026-10-11T18:00:00+01:00' });
  });
});
