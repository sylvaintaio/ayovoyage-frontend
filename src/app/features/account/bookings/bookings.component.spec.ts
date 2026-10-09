import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { BookingsComponent } from './bookings.component';

describe('BookingsComponent', () => {
  it('liste les réservations avec leur statut', async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingsComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/v1/bookings')
      .flush([
        { id: 'b1', reference: 'BV123', status: 'confirmed', route_name: 'Cotonou → Parakou', total_amount: 25000,
          departure_at: '2026-10-12T06:00:00Z', company_id: 'c', channel: 'web', contact_name: '', contact_phone: '',
          created_at: '', currency: 'XOF', discount_amount: 0, expires_at: '', loyalty_points_amount: 0,
          loyalty_points_used: 0, subtotal_amount: 25000 },
      ]);
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('BV123');
    expect(text).toContain('Confirmée');
  });
});
