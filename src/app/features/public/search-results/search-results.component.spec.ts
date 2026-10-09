import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideRouter } from '@angular/router';

import { provideApiConfiguration } from '../../../api/api-configuration';
import { SearchResultsComponent } from './search-results.component';

describe('SearchResultsComponent', () => {
  it('affiche les départs trouvés avec prix et places', async () => {
    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(SearchResultsComponent);
    fixture.componentRef.setInput('from', 'cotonou');
    fixture.componentRef.setInput('to', 'parakou');
    fixture.componentRef.setInput('date', '2026-10-12');
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((r) => r.url === '/api/v1/public/departures/search').flush([
      {
        id: 'd1', company_id: 'c', company_name: 'Trans Express', departure_at: '2026-10-12T06:00:00Z',
        arrival_eta: '2026-10-12T13:00:00Z', duration_minutes: 420, base_price: 7500, status: 'scheduled',
        route_name: 'Cotonou → Parakou', origin_city: 'Cotonou', origin_agency_id: 'a', origin_agency_name: 'Jonquet',
        destination_city: 'Parakou', destination_agency_id: 'b', destination_agency_name: 'Centre',
        bus_model: 'Yutong', bus_amenities: ['wifi'], seat_count: 48, available_seats: 5, included_baggage_kg: 20,
      },
    ]);
    http.match(() => true).forEach((r) => r.flush([]));
    await settle(fixture);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Trans Express');
    expect(text).toContain('5 places libres');
    expect(text).toContain('Wi-Fi');
    expect(text).toContain('07:00');
  });
});
