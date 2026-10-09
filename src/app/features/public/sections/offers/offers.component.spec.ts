import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../../testing/settle';
import { provideApiConfiguration } from '../../../../api/api-configuration';
import { OffersComponent } from './offers.component';

describe('OffersComponent', () => {
  it('classe les offres du tarif de base à la plus confortable', async () => {
    await TestBed.configureTestingModule({
      imports: [OffersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(OffersComponent);
    fixture.detectChanges();
    const offer = (code: string, name: string, surcharge: number) => ({
      code, name, description: '', surcharge_amount: surcharge, color: '#000', perks: [], company_name: 'Trans',
    });
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/showcase').flush({
      stats: { cities: 0, agencies: 0, routes: 0, departures_next_7_days: 0, passengers_carried: 0 },
      routes: [], loyalty_tiers: [],
      offers: [offer('vip', 'VIP', 5000), offer('standard', 'Standard', 0), offer('premium', 'Premium', 2000)],
    });
    await settle(fixture);
    const titles = [...fixture.nativeElement.querySelectorAll('h3')].map((h: HTMLElement) => h.textContent?.trim());
    expect(titles).toEqual(['Standard', 'Premium', 'VIP']);
    expect(fixture.nativeElement.querySelector('.offer--featured h3').textContent).toContain('VIP');
  });
});
