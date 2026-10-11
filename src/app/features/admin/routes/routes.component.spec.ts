import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { RoutesComponent } from './routes.component';

describe('RoutesComponent', () => {
  it('résume les arrêts et le mode de prix', async () => {
    await TestBed.configureTestingModule({
      imports: [RoutesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(RoutesComponent);
    fixture.detectChanges();
    const stop = (city: string, seq: number) => ({ seq, city_name: city, city_id: city, stop_point_id: city, stop_name: city,
      offset_minutes: seq * 60, pause_minutes: 0, can_board: seq === 0, can_alight: seq > 0 });
    TestBed.inject(HttpTestingController).expectOne('/api/v1/admin/routes').flush([
      { id: 'r1', name: 'Cotonou → Parakou', base_price: 7500, pricing_mode: 'grid', duration_minutes: 420, included_baggage_kg: 20,
        is_active: true, origin_agency_id: 'a', stops: [stop('Cotonou', 0), stop('Bohicon', 1), stop('Parakou', 2)],
        fares: [{ from_city_id: 'Cotonou', to_city_id: 'Bohicon', price: 3500 }] },
    ]);
    await settle(fixture);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Cotonou → Bohicon → Parakou');
    expect(text).toContain('Grille (1 trajets)');
    expect(text).toContain('terminus hors agence');
  });
});
