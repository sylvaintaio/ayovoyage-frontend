import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { DepartureOnboardComponent } from './departure-onboard.component';

const summary = {
  quota_seats: [{ seat_id: 'q1', seat_label: '12A', surcharge: 0 }, { seat_id: 'q2', seat_label: '12B', surcharge: 0 }],
  sales: [
    { booking_id: 'b1', reference: 'BV-1', contact_name: 'Voyageur à bord', boarding_seq: 0, alighting_seq: 2, seats: 1, seat_labels: '3A',
      amount: 8000, cash: 8000, status: 'confirmed', sold_offline: false, seller_name: 'Convoyeur', sold_at: '2026-10-11T08:00:00Z' },
    { booking_id: 'b2', reference: 'BV-2', contact_name: 'Afi', boarding_seq: 1, alighting_seq: 2, seats: 1, seat_labels: '12A',
      amount: 5000, cash: 5000, status: 'confirmed', sold_offline: true, seller_name: 'Convoyeur', sold_at: '2026-10-11T09:00:00Z' },
  ],
  cash: 13000,
  sales_count: 2,
  issues: [],
};

describe('DepartureOnboardComponent', () => {
  it('affiche les ventes à bord et exige une explication en cas d’écart de caisse', async () => {
    await TestBed.configureTestingModule({
      imports: [DepartureOnboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff', staff: { id: 's', company_id: 'c', email: '', full_name: 'Chef', phone: '', role: 'agency_manager', agency_id: 'a1' },
    });
    const fixture = TestBed.createComponent(DepartureOnboardComponent);
    fixture.componentRef.setInput('departureId', 'd1');
    fixture.componentRef.setInput('stops', [
      { seq: 0, city_name: 'Cotonou' }, { seq: 1, city_name: 'Bohicon' }, { seq: 2, city_name: 'Parakou' },
    ]);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/departures/d1/onboard').flush(summary);
    await settle(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('12A, 12B');
    expect(el.textContent).toContain('Bohicon → Parakou');
    expect(el.textContent).toContain('sans réseau');

    const counted = el.querySelector('input[name="counted"]') as HTMLInputElement;
    counted.value = '12500';
    counted.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(el.textContent).toContain('Écart');
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(fixture);
    http.expectNone('/api/v1/admin/departures/d1/onboard/handover');

    const note = el.querySelector('input[name="note"]') as HTMLInputElement;
    note.value = 'Billet de 500 manquant';
    note.dispatchEvent(new Event('input'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(fixture);
    const req = http.expectOne('/api/v1/admin/departures/d1/onboard/handover');
    expect(req.request.body).toEqual({ counted_cash: 12500, note: 'Billet de 500 manquant' });
  });
});
