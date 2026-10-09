import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { ParcelDetailComponent } from './parcel-detail.component';

describe('ParcelDetailComponent', () => {
  it('exige le code, la signature et l’encaissement du port dû avant la remise', async () => {
    await TestBed.configureTestingModule({
      imports: [ParcelDetailComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(ParcelDetailComponent);
    fixture.componentRef.setInput('id', 'p1');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/admin/parcels/p1').flush({
      id: 'p1', tracking_number: 'CLAAA', status: 'ready', sender_name: 'Awa', sender_phone: '+22997', recipient_name: 'Koffi',
      recipient_phone: '+22996', category: 'small', weight_kg: 7, pieces: 1, price: 4000, payer: 'recipient', paid: false,
      origin_agency_name: 'Cotonou', destination_agency_name: 'Parakou', current_agency_name: 'Parakou', created_at: '2026-10-08T10:00:00Z',
      description: 'Pagnes', declared_value: 0, currency: 'XOF', origin_agency_id: 'a', origin_city: 'Cotonou', destination_agency_id: 'b',
      destination_city: 'Parakou', company_name: 'Trans', events: [],
    });
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const button = () => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Remettre le colis')) as HTMLButtonElement;
    expect(el.textContent?.replace(/\s/g, ' ')).toContain('j’ai encaissé 4 000 F CFA');
    const code = el.querySelector('#pd-code') as HTMLInputElement;
    code.value = '123456';
    code.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(button().disabled).toBe(true); // ni signature ni encaissement
  });
});
