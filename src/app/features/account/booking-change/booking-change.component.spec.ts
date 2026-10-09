import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { BookingChangeComponent, changeDays, isoDay } from './booking-change.component';

describe('changeDays', () => {
  it('propose les jours d’aujourd’hui à la fin de la fenêtre', () => {
    const days = changeDays(new Date(2026, 9, 12, 7), new Date(2026, 9, 9, 22));
    expect(days.map((d) => d.iso)).toEqual(['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
    expect(isoDay(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('BookingChangeComponent', () => {
  it('choisit un départ, affiche le devis puis envoie vers le paiement', async () => {
    await TestBed.configureTestingModule({
      imports: [BookingChangeComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(BookingChangeComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('id', 'b1');
    fixture.detectChanges();

    const dep = new Date(Date.now() + 2 * 86_400_000);
    http.expectOne('/api/v1/bookings/b1').flush({
      id: 'b1', reference: 'BV123', status: 'confirmed',
      departure: { departure_at: dep.toISOString(), origin_city: 'Cotonou', destination_city: 'Parakou' },
      seats: [{ status: 'sold' }, { status: 'sold' }], tickets: [], payments: [],
    });
    http.expectOne('/api/v1/bookings/b1/policy').flush({
      currency: 'XOF',
      cancel: { allowed: true },
      change: { allowed: true, fee_per_passenger: 1000, fee_total: 2000, free_by_tier: false, remaining_changes: 1,
        window_end: new Date(Date.now() + 10 * 86_400_000).toISOString(), passengers: 2 },
    });
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;

    // Le jour du départ actuel est présélectionné.
    http.expectOne((r) => r.url === '/api/v1/bookings/b1/change/departures' && r.params.get('date') === isoDay(dep)).flush([
      { id: 'd2', departure_at: dep.toISOString(), arrival_eta: dep.toISOString(), base_price: 15000,
        origin_agency_name: 'Jonquet', destination_agency_name: 'Parakou Centre', bus_model: 'Yutong', available_seats: 12 },
    ]);
    await settle(fixture);
    const text = () => (el.textContent ?? '').replace(/\s/g, ' ');
    expect(text()).toContain('1 000 F CFA par passager');

    (el.querySelector('.dep') as HTMLButtonElement).click();
    http.expectOne('/api/v1/bookings/b1/change/quote').flush({
      departure_id: 'd2', passengers: 2, new_fare: 30000, credit: 25000, fee: 2000, fare_difference: 5000,
      amount_due: 7000, non_refundable_gap: 0, currency: 'XOF',
    });
    await settle(fixture);
    const pay = el.querySelector('.summary .btn--primary') as HTMLButtonElement;
    expect(text()).toContain('Différence de tarif');
    expect(pay.textContent?.replace(/\s/g, ' ')).toContain('Confirmer et payer 7 000');

    pay.click();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/bookings/b1/change');
    expect(req.request.body).toEqual({ departure_id: 'd2' });
    req.flush({ id: 'b2', status: 'pending' });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith(['/reservation', 'b2', 'paiement']);
  });
});
