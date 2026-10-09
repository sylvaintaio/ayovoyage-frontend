import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideRouter } from '@angular/router';

import { provideApiConfiguration } from '../../../api/api-configuration';
import { AgencyComponent } from './agency.component';

describe('AgencyComponent', () => {
  it('affiche les contacts et les prochains départs', async () => {
    await TestBed.configureTestingModule({
      imports: [AgencyComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(AgencyComponent);
    fixture.componentRef.setInput('slug', 'jonquet');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/agencies/jonquet').flush({
      id: '1', company_id: 'c', company_name: 'Trans', city_id: 'x', city_name: 'Cotonou', city_slug: 'cotonou',
      name: 'Cotonou — Jonquet', slug: 'jonquet', address: 'Rue 112', landmark: 'Pharmacie', phone: '+22901000001',
      whatsapp: '+22901000001', email: '', opening_hours: [], services: ['ticketing'], instructions: '', photos: [],
      is_active: true, latitude: 6.36, longitude: 2.41, destinations: [{ id: '', name: 'Parakou', slug: 'parakou', country_code: 'BJ' }],
      upcoming_departures: [{ id: 'd1', departure_at: '2026-10-12T06:00:00Z', arrival_eta: '', base_price: 7500, status: 'scheduled',
        destination_city: 'Parakou', destination_agency_name: 'Centre', available_seats: 12 }],
    });
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[href="tel:+22901000001"]')).toBeTruthy();
    expect(el.textContent).toContain('Parakou');
    expect(el.querySelector('a[href^="https://wa.me/"]')).toBeTruthy();
  });
});
