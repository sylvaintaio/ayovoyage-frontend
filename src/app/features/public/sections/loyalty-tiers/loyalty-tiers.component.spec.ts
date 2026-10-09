import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../../testing/settle';
import { provideApiConfiguration } from '../../../../api/api-configuration';
import { LoyaltyTiersComponent } from './loyalty-tiers.component';

describe('LoyaltyTiersComponent', () => {
  it('affiche les niveaux et leurs réductions', async () => {
    await TestBed.configureTestingModule({
      imports: [LoyaltyTiersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(LoyaltyTiersComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/showcase').flush({
      stats: { cities: 0, agencies: 0, routes: 0, departures_next_7_days: 0, passengers_carried: 0 },
      routes: [], offers: [],
      loyalty_tiers: [
        { code: 'bronze', name: 'Bronze', min_trips: 0, discount_percent: 0, perks: [], company_name: 'T' },
        { code: 'gold', name: 'Or', min_trips: 15, discount_percent: 10, perks: ['Bagage gratuit'], company_name: 'T' },
      ],
    });
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Dès l’inscription');
    expect(fixture.nativeElement.querySelector('.tier:last-child .tier__discount').textContent.trim()).toBe('−10 %');
    expect(text).toContain('sur vos billets');
    expect(fixture.nativeElement.querySelectorAll('.tier__bar--on').length).toBe(1 + 2);
  });
});
