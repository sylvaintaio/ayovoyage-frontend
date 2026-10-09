import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { ParcelTrackingComponent } from './parcel-tracking.component';

async function setup() {
  await TestBed.configureTestingModule({
    imports: [ParcelTrackingComponent],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
  }).compileComponents();
  const fixture = TestBed.createComponent(ParcelTrackingComponent);
  fixture.componentRef.setInput('numero', 'CLX865CUZW');
  fixture.detectChanges();
  return { fixture, http: TestBed.inject(HttpTestingController), el: fixture.nativeElement as HTMLElement };
}

const tracking = {
  tracking_number: 'CLX865CUZW', status: 'ready', status_label: 'Disponible au retrait', company_name: 'Trans Express',
  origin_city: 'Cotonou', origin_agency: 'Cotonou — Jonquet', destination_city: 'Parakou', destination_agency: 'Parakou — Centre',
  destination_address: 'Avenue de la Paix', destination_phone: '+22901000001', sender_name: 'Awa D.', recipient_name: 'Koffi M.',
  pieces: 2, amount_due: 4000, created_at: '2026-10-08T10:00:00Z',
  steps: [
    { type: 'accepted', label: 'Colis déposé et vérifié', place: 'Cotonou — Jonquet', created_at: '2026-10-08T10:00:00Z' },
    { type: 'arrived', label: 'Arrivé en agence', place: 'Parakou — Centre', created_at: '2026-10-09T05:00:00Z' },
  ],
};

describe('ParcelTrackingComponent', () => {
  it('affiche l’étape, le lieu de retrait et le port dû', async () => {
    const { fixture, http, el } = await setup();
    http.expectOne('/api/v1/public/parcels/CLX865CUZW').flush(tracking);
    await settle(fixture);
    const text = (el.textContent ?? '').replace(/\s/g, ' ');
    expect(text).toContain('Disponible au retrait');
    expect(text).toContain('Votre colis vous attend');
    expect(text).toContain('4 000 F CFA');
    expect(el.querySelector('.progress li.current')?.textContent).toContain('À retirer');
    expect(el.querySelectorAll('bv-timeline li').length).toBe(2);
  });

  it('renvoie vers le signalement connecté avec le colis présélectionné', async () => {
    const { fixture, http, el } = await setup();
    http.expectOne('/api/v1/public/parcels/CLX865CUZW').flush(tracking);
    await settle(fixture);
    const link = el.querySelector('a[href^="/compte/signaler"]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/compte/signaler?colis=CLX865CUZW');
  });

  it('indique un numéro introuvable', async () => {
    const { fixture, http, el } = await setup();
    http.expectOne('/api/v1/public/parcels/CLX865CUZW').flush({}, { status: 404, statusText: 'Not Found' });
    await settle(fixture);
    expect(el.textContent).toContain('Colis introuvable');
  });
});
