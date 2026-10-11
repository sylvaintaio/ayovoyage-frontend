import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { CounterComponent, defaultBoarding } from './counter.component';

describe('CounterComponent', () => {
  it('liste les départs ouverts à la vente', async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(CounterComponent);
    fixture.detectChanges();
    const dep = { id: 'd1', route_id: 'r', route_name: 'Cotonou → Parakou', bus_id: 'b', plate_number: 'AB 1234 RB',
      departure_at: '2026-10-12T06:00:00Z', arrival_eta: '', base_price: 7500, notes: '', seat_count: 48, sold_seats: 4, peak_seats: 3, boarded_seats: 0 };
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/v1/admin/departures').flush([
      { ...dep, status: 'scheduled' },
      { ...dep, id: 'd2', status: 'departed' },
      { ...dep, id: 'd3', status: 'arrived' },
    ]);
    await settle(fixture);
    const items = fixture.nativeElement.querySelectorAll('.dep');
    // Car en route : encore en vente pour les arrêts suivants ; places libres = capacité − charge max.
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('45 libre(s)');
    expect(items[1].textContent).toContain('en route');
  });
});

describe('defaultBoarding', () => {
  const stop = (seq: number, agency?: string, can_board = true) => ({ seq, agency_id: agency, can_board, can_alight: true,
    city_id: 'c', city_name: 'V', stop_point_id: 's', stop_name: 'A' + seq, scheduled_at: '', pause_minutes: 0 });
  const stops = [stop(0, 'cot'), stop(1, 'boh'), stop(2, undefined, false), stop(3, 'par')];

  it("prend l'arrêt de l'agence du vendeur", () => {
    expect(defaultBoarding(stops, 'boh', new Set())).toBe(1);
  });

  it('prend le premier arrêt ouvert sinon, en sautant ceux déjà quittés', () => {
    expect(defaultBoarding(stops, undefined, new Set())).toBe(0);
    expect(defaultBoarding(stops, 'cot', new Set([0]))).toBe(1);
  });

  it("ignore le terminus pour la montée", () => {
    expect(defaultBoarding(stops, 'par', new Set())).toBe(0);
  });
});
