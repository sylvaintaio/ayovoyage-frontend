import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../../testing/settle';
import { provideApiConfiguration } from '../../../../api/api-configuration';
import { HeroComponent } from './hero.component';

describe('HeroComponent', () => {
  it('présente l’accroche, le tableau des prochains départs et la recherche', async () => {
    await TestBed.configureTestingModule({
      imports: [HeroComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(HeroComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/showcase').flush({
      stats: { cities: 0, agencies: 0, routes: 0, departures_next_7_days: 0, passengers_carried: 0 },
      routes: [], offers: [], loyalty_tiers: [], policies: [],
      next_departures: [
        { id: 'd1', departure_at: '2030-01-01T07:00:00+01:00', origin_city: 'Cotonou', origin_slug: 'cotonou',
          destination_city: 'Parakou', destination_slug: 'parakou', price: 7500, available_seats: 3, boarding: false,
          company_name: 'T' },
      ],
    });
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')).toBeTruthy();
    expect(el.querySelector('bv-search-form')).toBeTruthy();
    const row = el.querySelector<HTMLAnchorElement>('a.board__row')!;
    expect(row.getAttribute('href')).toBe('/departs/d1');
    expect(row.textContent).toContain('07:00');
    expect(row.textContent).toContain('Parakou');
    expect(row.textContent).toContain('3 places');
  });
});
