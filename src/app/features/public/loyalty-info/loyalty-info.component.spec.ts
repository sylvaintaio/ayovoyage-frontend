import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { LoyaltyInfoComponent } from './loyalty-info.component';

describe('LoyaltyInfoComponent', () => {
  it('affiche le barème réel du programme', async () => {
    await TestBed.configureTestingModule({
      imports: [LoyaltyInfoComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(LoyaltyInfoComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/showcase').flush({
      stats: { cities: 0, agencies: 0, routes: 0, departures_next_7_days: 0, passengers_carried: 0 },
      routes: [], offers: [], loyalty_tiers: [],
      loyalty: { points_per_100: 1, point_value: 5, signup_bonus_points: 50 },
    });
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('50 points offerts');
    expect(text).toContain('Rejoindre le programme');
  });
});
