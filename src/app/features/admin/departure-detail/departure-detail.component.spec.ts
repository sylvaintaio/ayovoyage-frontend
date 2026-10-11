import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { AdminDeparture } from '../../../api/models';
import { DepartureDetailComponent, buildTimeline } from './departure-detail.component';

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

describe('buildTimeline', () => {
  const stop = (seq: number, name: string, at: string) => ({ seq, stop_name: name, scheduled_at: at, pause_minutes: 0, can_board: true,
    can_alight: true, city_id: 'c', city_name: name, stop_point_id: 's' + seq });
  const dep = {
    stops: [stop(0, 'Cotonou', '2026-10-12T06:00:00Z'), stop(1, 'Bohicon', '2026-10-12T07:40:00Z'), stop(2, 'Parakou', '2026-10-12T11:00:00Z')],
    visits: [
      { id: 'v0', seq: 0, reason: 'planned', arrived_at: '2026-10-12T05:50:00Z', departed_at: '2026-10-12T06:10:00Z' },
      { id: 'v1', reason: 'police', note: 'Contrôle', arrived_at: '2026-10-12T07:00:00Z', departed_at: '2026-10-12T07:12:00Z', latitude: 7.1, longitude: 2.2, mocked: true },
      { id: 'v2', seq: 1, reason: 'planned', arrived_at: '2026-10-12T08:00:00Z' },
    ],
  } as unknown as AdminDeparture;

  it('intercale les arrêts imprévus et calcule retards et durées', () => {
    const t = buildTimeline(dep);
    expect(t.map((i) => i.name)).toEqual(['Cotonou', 'Contrôle de police', 'Bohicon', 'Parakou']);
    expect(t[0].delay).toBe(10); // départ du premier arrêt : comparé à l'heure prévue
    expect(t[1]).toMatchObject({ kind: 'unplanned', stayMinutes: 12, mocked: true, position: '7.10000, 2.20000' });
    expect(t[2]).toMatchObject({ delay: 20, stayMinutes: undefined });
    expect(t[3].arrivedAt).toBeUndefined();
  });
});
