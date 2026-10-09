import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { LoyaltyComponent } from './loyalty.component';

describe('LoyaltyComponent', () => {
  it('montre le solde et la progression vers le niveau suivant', async () => {
    await TestBed.configureTestingModule({
      imports: [LoyaltyComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(LoyaltyComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/me/loyalty').flush([
      { company_id: 'c', company_name: 'Trans', points_balance: 300, points_value: 1500, tier_code: 'bronze', tier_name: 'Bronze',
        trips_12m: 2, perks: ['Cumul de points'], trips_to_next_tier: 4,
        next_tier: { code: 'silver', name: 'Argent', min_trips: 6, discount_percent: 5, perks: [] } },
    ]);
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('300');
    expect(text).toContain('Argent');
    expect(fixture.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuemax')).toBe('6');
  });
});
