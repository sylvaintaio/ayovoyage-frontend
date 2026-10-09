import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../../testing/settle';
import { provideApiConfiguration } from '../../../../api/api-configuration';
import { StatsBandComponent } from './stats-band.component';

describe('StatsBandComponent', () => {
  it('n’affiche que les chiffres réels non nuls', async () => {
    await TestBed.configureTestingModule({
      imports: [StatsBandComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(StatsBandComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/showcase').flush({
      stats: { cities: 5, agencies: 5, routes: 3, departures_next_7_days: 25, passengers_carried: 0 },
      routes: [], offers: [], loyalty_tiers: [],
    });
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('villes desservies');
    expect(text).not.toContain('voyageurs transportés');
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(4);
  });
});
