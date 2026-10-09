import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { ReviewComponent } from './review.component';

describe('ReviewComponent', () => {
  it('exige une note globale puis envoie l’avis', async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReviewComponent);
    fixture.componentRef.setInput('token', 'abcdefghijklmnopqrstuvwxyz');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/public/reviews/abcdefghijklmnopqrstuvwxyz').flush({
      company_name: 'Trans', origin_city: 'Cotonou', destination_city: 'Parakou', departure_at: '2026-10-09T07:00:00Z',
      reference: 'BV1', first_name: 'Awa', reviewed: false, expired: false,
    });
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Cotonou → Parakou');

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(el.textContent).toContain('Choisissez une note globale');

    el.querySelectorAll<HTMLInputElement>('bv-star-rating input')[4].dispatchEvent(new Event('change'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.body.rating).toBe(5);
    expect(req.request.body.publish_consent).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);
    expect(el.querySelector('h1')!.textContent).toContain('Merci Awa');
  });
});
