import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { BookingDetail, BookingPolicy } from '../../../api/models';
import { BookingDetailComponent } from './booking-detail.component';

const tomorrow = new Date(Date.now() + 86_400_000).toISOString();

function booking(over: Partial<BookingDetail> = {}): BookingDetail {
  return {
    id: 'b1', reference: 'BV123', status: 'confirmed', total_amount: 12500, subtotal_amount: 12500, discount_amount: 0,
    loyalty_points_used: 0, loyalty_points_amount: 0, currency: 'XOF', contact_name: 'Awa', contact_phone: '+229',
    company_id: 'c', channel: 'web', created_at: '', expires_at: '', change_count: 0, change_fee_amount: 0, change_credit_amount: 0,
    departure: { id: 'd', departure_at: tomorrow, arrival_eta: '', status: 'scheduled',
      route_name: '', origin_city: 'Cotonou', origin_agency_name: 'Jonquet', destination_city: 'Parakou', company_name: 'Trans', included_baggage_kg: 20 },
    seats: [{ seat_id: 's', seat_label: '1A', category_code: 'vip', category_name: 'VIP', passenger_name: 'Awa', base_price: 7500,
      category_surcharge: 5000, seat_surcharge: 0, discount_amount: 0, total_price: 12500, status: 'sold' }],
    tickets: [{ id: 't1', ticket_number: 'TK-1', seat_label: '1A', passenger_name: 'Awa', status: 'valid', qr_payload: 'BV1.x.y' }],
    payments: [],
    ...over,
  } as BookingDetail;
}

const policy: BookingPolicy = {
  currency: 'XOF',
  cancel: { allowed: true, cutoff_hours: 6, fee_percent: 10, paid_amount: 12500, refund_amount: 11250, deadline: tomorrow },
  change: { allowed: true, cutoff_hours: 3, fee_per_passenger: 0, fee_total: 0, free_by_tier: true, tier_name: 'Or',
    max_changes: 1, remaining_changes: 1, window_days: 30, passengers: 1, deadline: tomorrow, window_end: tomorrow },
};

async function setup(b: BookingDetail, p: BookingPolicy | null) {
  await TestBed.configureTestingModule({
    imports: [BookingDetailComponent],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
  }).compileComponents();
  const fixture = TestBed.createComponent(BookingDetailComponent);
  fixture.componentRef.setInput('id', 'b1');
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('/api/v1/bookings/b1').flush(b);
  const req = http.expectOne('/api/v1/bookings/b1/policy');
  if (p) {
    req.flush(p);
  } else {
    req.flush({ title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
  }
  await settle(fixture, 5);
  return fixture.nativeElement as HTMLElement;
}

describe('BookingDetailComponent', () => {
  it('affiche les billets, les conditions réelles et les actions possibles', async () => {
    const el = await setup(booking(), policy);
    expect(el.querySelector('bv-qr-code')).toBeTruthy();
    expect(el.querySelector('a[href="/api/v1/tickets/t1/pdf"]')).toBeTruthy();
    expect(el.textContent).toContain('Frais de 10 %');
    expect(el.textContent).toContain('Avantage Or : modification offerte');
    expect(el.textContent).toContain('Annuler la réservation');
    expect(el.querySelector('a[href="/compte/reservations/b1/modifier"]')?.textContent).toContain('Changer de départ');
  });

  it('masque les actions refusées et explique pourquoi', async () => {
    const closed: BookingPolicy = {
      ...policy,
      cancel: { ...policy.cancel, allowed: false, reason: 'L’annulation en ligne est possible jusqu’à 6 h avant le départ.' },
      change: { ...policy.change, allowed: false, reason: 'Le nombre maximal de modifications (1) est atteint.' },
    };
    const el = await setup(booking(), closed);
    expect(el.textContent).toContain('jusqu’à 6 h avant le départ');
    expect(el.textContent).toContain('nombre maximal de modifications');
    expect(el.textContent).not.toContain('Changer de départ');
    expect(el.querySelector('.btn--danger')).toBeNull();
  });

  it('renvoie vers la nouvelle réservation après une modification', async () => {
    const el = await setup(
      booking({ status: 'changed', replaced_by: { id: 'b2', reference: 'BV456' }, cancel_reason: 'Remplacée par la réservation BV456' }),
      { ...policy, cancel: { ...policy.cancel, allowed: false }, change: { ...policy.change, allowed: false } },
    );
    expect(el.textContent).toContain('ces billets ne sont plus valables');
    expect(el.querySelector('a[href="/compte/reservations/b2"]')?.textContent).toContain('BV456');
    expect(el.querySelector('.conditions')).toBeNull();
  });
});
