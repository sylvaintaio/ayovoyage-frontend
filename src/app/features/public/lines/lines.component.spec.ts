import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { LinesComponent } from './lines.component';

describe('LinesComponent', () => {
  it('calcule le prix de chaque classe dans la grille tarifaire', async () => {
    await TestBed.configureTestingModule({
      imports: [LinesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(LinesComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/showcase').flush({
      stats: { cities: 0, agencies: 0, routes: 0, departures_next_7_days: 0, passengers_carried: 0 },
      routes: [{ name: 'Cotonou → Parakou', origin_city: 'Cotonou', origin_slug: 'cotonou', destination_city: 'Parakou',
        destination_slug: 'parakou', from_price: 7500, duration_minutes: 420, included_baggage_kg: 20, departures_next_7_days: 13, company_name: 'T' }],
      offers: [
        { code: 'standard', name: 'Standard', description: '', surcharge_amount: 0, color: '', perks: [], company_name: 'T' },
        { code: 'vip', name: 'VIP', description: '', surcharge_amount: 5000, color: '', perks: [], company_name: 'T' },
      ],
      loyalty_tiers: [],
    });
    await settle(fixture);
    const row: string = fixture.nativeElement.querySelector('tbody tr').textContent.replace(/\s/g, '');
    expect(row).toContain('7500FCFA');
    expect(row).toContain('12500FCFA');
  });
});
