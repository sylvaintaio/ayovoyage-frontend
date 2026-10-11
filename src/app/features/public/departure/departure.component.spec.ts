import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideRouter } from '@angular/router';

import { provideApiConfiguration } from '../../../api/api-configuration';
import { DepartureDetail } from '../../../api/models';
import { DepartureComponent, seqParam } from './departure.component';

const departure: DepartureDetail = {
  id: 'd1', company_id: 'c', company_name: 'Trans Express', departure_at: '2026-10-12T06:00:00Z',
  arrival_eta: '2026-10-12T13:00:00Z', duration_minutes: 420, base_price: 7500, status: 'scheduled',
  route_name: 'Cotonou → Parakou', origin_city: 'Cotonou', origin_agency_id: 'a', origin_agency_name: 'Jonquet',
  origin_agency_address: 'Rue 112', destination_city: 'Parakou', destination_agency_id: 'b',
  destination_agency_name: 'Centre', bus_model: 'Yutong', bus_amenities: [], seat_count: 2, available_seats: 2,
  included_baggage_kg: 20, boarding_seq: 0, alighting_seq: 1, bus_departure_at: '2026-10-12T06:00:00Z', stops: [],
  categories: [{ id: 'vip', code: 'vip', name: 'VIP', color: '#b45309', description: '', perks: [], price: 12500, surcharge_amount: 5000, sort_order: 1, available: 2 }],
  seat_map: {
    rows: 1, cols: 2, cells: [
      { id: 's1', row: 0, col: 0, kind: 'seat', seat_label: '1A', category_id: 'vip', price: 12500, state: 'available' },
      { id: 's2', row: 0, col: 1, kind: 'seat', seat_label: '1B', category_id: 'vip', price: 12500, state: 'available' },
    ],
  },
};

describe('DepartureComponent', () => {
  it('ajoute un passager par siège sélectionné et calcule le total', async () => {
    await TestBed.configureTestingModule({
      imports: [DepartureComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(DepartureComponent);
    fixture.componentRef.setInput('id', 'd1');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/v1/public/departures/d1').flush(departure);
    await settle(fixture);

    const seats = fixture.nativeElement.querySelectorAll('button.seat') as NodeListOf<HTMLButtonElement>;
    seats[0].click();
    seats[1].click();
    await settle(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('input[id^="p"]').length).toBe(2);
    expect(el.querySelector('.total')?.textContent?.replace(/\s/g, '')).toContain('25000FCFA');
    expect(el.textContent).toContain('Se connecter pour réserver');
  });
});

describe('seqParam', () => {
  it("lit l'indice d'arrêt de l'adresse", () => {
    expect(seqParam('2')).toBe(2);
    expect(seqParam('0')).toBe(0);
    expect(seqParam(undefined)).toBeUndefined();
    expect(seqParam('')).toBeUndefined();
    expect(seqParam('-1')).toBeUndefined();
    expect(seqParam('x')).toBeUndefined();
  });
});
