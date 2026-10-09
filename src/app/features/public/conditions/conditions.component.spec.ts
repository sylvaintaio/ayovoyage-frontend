import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { ConditionsComponent } from './conditions.component';

describe('ConditionsComponent', () => {
  it('affiche les règles réelles de la compagnie et les avantages fidélité', async () => {
    await TestBed.configureTestingModule({
      imports: [ConditionsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConditionsComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/showcase').flush({
      stats: { cities: 0, agencies: 0, routes: 0, departures_next_7_days: 0, passengers_carried: 0 },
      routes: [], offers: [],
      loyalty_tiers: [
        { code: 'bronze', name: 'Bronze', min_trips: 0, discount_percent: 0, perks: [], company_name: 'Trans Express', free_change: false },
        { code: 'platinum', name: 'Platine', min_trips: 30, discount_percent: 15, perks: [], company_name: 'Trans Express',
          cancellation_fee_percent: 0, cancellation_cutoff_hours: 1, free_change: true },
      ],
      policies: [{ company_name: 'Trans Express', cancellation_cutoff_hours: 6, cancellation_fee_percent: 10, change_enabled: true,
        change_cutoff_hours: 3, change_fee_amount: 1000, change_max_count: 1, change_window_days: 30 }],
    });
    await settle(fixture);
    const text = (fixture.nativeElement.textContent as string).replace(/\s/g, ' ');
    expect(text).toContain('6 h avant le départ');
    expect(text).toContain('10 %');
    expect(text).toContain('1 000 F CFA par passager');
    expect(text).toContain('30 jours');
    expect(text).toContain('Platine annulation jusqu’à 1 h avant, sans frais · modification gratuite');
    expect(text).not.toContain('Bronze');
  });
});
