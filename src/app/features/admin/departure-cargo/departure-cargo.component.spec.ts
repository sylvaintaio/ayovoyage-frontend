import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { DepartureCargoComponent } from './departure-cargo.component';

describe('DepartureCargoComponent', () => {
  it('charge un colis par scan et signale un bagage d’un autre départ', async () => {
    await TestBed.configureTestingModule({
      imports: [DepartureCargoComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(DepartureCargoComponent);
    fixture.componentRef.setInput('departureId', 'd1');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const parcel = { id: 'p1', tracking_number: 'CLAAA', status: 'assigned', recipient_name: 'Koffi', category: 'small', weight_kg: 7, pieces: 1,
      description: '', destination_agency_name: 'Parakou', is_final_leg: true };
    http.expectOne('/api/v1/admin/departures/d1/parcels').flush([parcel]);
    http.expectOne('/api/v1/admin/departures/d1/baggage').flush([]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('0/1 colis');

    const input = el.querySelector('#cg-code') as HTMLInputElement;
    input.value = 'https://busvoyage.bj/colis/suivi/claaa';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne('/api/v1/admin/parcels/scan');
    expect(req.request.body).toEqual({ tracking: 'CLAAA', action: 'load', departure_id: 'd1' });
    req.flush({ ...parcel, status: 'loaded' });
    await settle(fixture);
    http.expectOne('/api/v1/admin/departures/d1/parcels').flush([{ ...parcel, status: 'loaded' }]);
    http.expectOne('/api/v1/admin/departures/d1/baggage').flush([]);
    await settle(fixture);
    expect(el.textContent).toContain('chargé');
    expect(el.textContent).toContain('1/1 colis');

    input.value = 'BG-XYZ1234';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    http.expectOne('/api/v1/admin/baggage/scan').flush({ detail: 'Ce bagage voyage sur un autre départ : ne pas le charger' }, { status: 409, statusText: 'Conflict' });
    await settle(fixture);
    expect(el.querySelector('.feedback--ko')?.textContent).toContain('autre départ');
  });
});
