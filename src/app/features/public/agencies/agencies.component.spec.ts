import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideRouter } from '@angular/router';

import { provideApiConfiguration } from '../../../api/api-configuration';
import { Agency } from '../../../api/models';
import { AgenciesComponent } from './agencies.component';

const agency = (name: string, city: string, services: string[]): Agency => ({
  id: name, company_id: 'c', company_name: 'Trans', city_id: city, city_name: city, city_slug: city.toLowerCase(),
  name, slug: name.toLowerCase(), address: 'Rue', landmark: '', phone: '+229', whatsapp: '', email: '',
  opening_hours: [], services, instructions: '', photos: [], is_active: true,
});

describe('AgenciesComponent', () => {
  it('filtre les agences par service', async () => {
    await TestBed.configureTestingModule({
      imports: [AgenciesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(AgenciesComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/public/agencies').flush([
      agency('Jonquet', 'Cotonou', ['ticketing', 'lounge']),
      agency('Centre', 'Parakou', ['ticketing']),
    ]);
    http.expectOne('/api/v1/public/cities').flush([]);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('li.agency').length).toBe(2);

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#ag-service');
    select.value = 'lounge';
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('li.agency').length).toBe(1);
  });
});
