import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AdminBookingsComponent } from './bookings.component';

describe('AdminBookingsComponent', () => {
  it('normalise un numéro de téléphone saisi librement', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBookingsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminBookingsComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url === '/api/v1/admin/bookings').flush([]);
    await settle(fixture);

    const input = fixture.nativeElement.querySelector('#ab-q') as HTMLInputElement;
    input.value = '01 97 00 00 01';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    const req = http.expectOne((r) => r.url === '/api/v1/admin/bookings');
    expect(req.request.params.get('q')).toBe('+2290197000001');
    req.flush([]);
  });
});
