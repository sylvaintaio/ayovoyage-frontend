import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { AdminBookingDetailComponent } from './booking-detail.component';

describe('AdminBookingDetailComponent', () => {
  it('permet au caissier d’imprimer mais pas d’annuler', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBookingDetailComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff', staff: { id: 's', company_id: 'c', email: '', full_name: 'Caissier', phone: '', role: 'cashier' },
    });
    const fixture = TestBed.createComponent(AdminBookingDetailComponent);
    fixture.componentRef.setInput('id', 'b1');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/bookings/b1').flush({
      id: 'b1', reference: 'BV123', status: 'confirmed', total_amount: 7500, subtotal_amount: 7500, discount_amount: 0,
      loyalty_points_used: 0, loyalty_points_amount: 0, currency: 'XOF', contact_name: 'Client', contact_phone: '+229',
      company_id: 'c', channel: 'counter', created_at: '', expires_at: '',
      departure: { id: 'd', departure_at: '2026-10-12T06:00:00Z', arrival_eta: '', status: 'scheduled', route_name: 'Cotonou → Parakou',
        origin_city: '', origin_agency_name: '', destination_city: '', company_name: '', included_baggage_kg: 20 },
      seats: [{ seat_id: 's', seat_label: '4A', category_code: 'standard', category_name: 'Standard', passenger_name: 'Client',
        base_price: 7500, category_surcharge: 0, seat_surcharge: 0, discount_amount: 0, total_price: 7500, status: 'sold' }],
      tickets: [{ id: 't1', ticket_number: 'TK-1', seat_label: '4A', passenger_name: 'Client', status: 'valid', qr_payload: '' }],
      payments: [],
    });
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[href="/api/v1/admin/tickets/t1/pdf"]')).toBeTruthy();
    expect(el.textContent).not.toContain('Annuler la réservation');

    // Le guichet peut changer le départ (conditions chargées en parallèle).
    http.expectOne('/api/v1/admin/bookings/b1/policy').flush({
      currency: 'XOF',
      cancel: { allowed: true, cutoff_hours: 6, fee_percent: 10, paid_amount: 7500, refund_amount: 6750 },
      change: { allowed: true, cutoff_hours: 0, fee_per_passenger: 1000, fee_total: 1000, free_by_tier: false,
        max_changes: 0, remaining_changes: 99, window_days: 30, passengers: 1 },
    });
    await settle(fixture);
    expect(el.textContent).toContain('Changer de départ');
  });
});
