import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { DepartureDetailComponent } from './departure-detail.component';

describe('DepartureDetailComponent', () => {
  it('affiche les actions de statut et le manifeste pour un chef d’agence', async () => {
    await TestBed.configureTestingModule({
      imports: [DepartureDetailComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff', staff: { id: 's', company_id: 'c', email: '', full_name: 'Chef', phone: '', role: 'agency_manager' },
    });
    const fixture = TestBed.createComponent(DepartureDetailComponent);
    fixture.componentRef.setInput('id', 'd1');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/departures/d1').flush({
      departure: { id: 'd1', route_id: 'r', route_name: 'Cotonou → Parakou', bus_id: 'b', plate_number: 'AB 1',
        departure_at: '2026-10-12T06:00:00Z', arrival_eta: '2026-10-12T13:00:00Z', base_price: 7500, status: 'scheduled',
        notes: '', seat_count: 48, sold_seats: 1, boarded_seats: 0 },
      categories: [], seat_map: { rows: 1, cols: 1, cells: [] },
    });
    await settle(fixture);
    http.expectOne('/api/v1/agent/departures/d1/manifest').flush({
      departure_id: 'd1', expected: 1, boarded: 0, missing: 1, generated_at: '',
      passengers: [{ seat_label: '1A', passenger_name: 'Awa', booking_reference: 'BV1', ticket_id: 't', ticket_number: 'TK',
        ticket_status: 'valid', category_code: 'vip' }],
    });
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain("Ouvrir l'embarquement");
    expect(text).toContain('Annuler le départ');
    expect(text).toContain('Awa');
  });
});
