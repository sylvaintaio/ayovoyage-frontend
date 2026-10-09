import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../../testing/settle';
import { provideApiConfiguration } from '../../../../api/api-configuration';
import { PopularRoutesComponent } from './popular-routes.component';

describe('PopularRoutesComponent', () => {
  it('affiche chaque ligne avec son prix de départ et un lien de recherche', async () => {
    await TestBed.configureTestingModule({
      imports: [PopularRoutesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(PopularRoutesComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/showcase').flush({
      stats: { cities: 0, agencies: 0, routes: 0, departures_next_7_days: 0, passengers_carried: 0 },
      routes: [{ name: 'Cotonou → Parakou', origin_city: 'Cotonou', origin_slug: 'cotonou', destination_city: 'Parakou',
        destination_slug: 'parakou', from_price: 7500, duration_minutes: 420, included_baggage_kg: 20,
        departures_next_7_days: 13, company_name: 'Trans' }],
      offers: [], loyalty_tiers: [],
    });
    await settle(fixture);
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.line');
    expect(link.getAttribute('href')).toContain('/recherche?from=cotonou&to=parakou');
    expect(link.textContent?.replace(/\s/g, '')).toContain('7500FCFA');
    expect(link.textContent).toContain('13 départs / semaine');
  });
});
