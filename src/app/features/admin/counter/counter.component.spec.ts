import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  it('liste les départs ouverts à la vente', async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(CounterComponent);
    fixture.detectChanges();
    const dep = { id: 'd1', route_id: 'r', route_name: 'Cotonou → Parakou', bus_id: 'b', plate_number: 'AB 1234 RB',
      departure_at: '2026-10-12T06:00:00Z', arrival_eta: '', base_price: 7500, notes: '', seat_count: 48, sold_seats: 3, boarded_seats: 0 };
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/v1/admin/departures').flush([
      { ...dep, status: 'scheduled' },
      { ...dep, id: 'd2', status: 'departed' },
    ]);
    await settle(fixture);
    const items = fixture.nativeElement.querySelectorAll('.dep');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('45 libre(s)');
  });
});
