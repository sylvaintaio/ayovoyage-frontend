import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { TicketsComponent } from './tickets.component';

describe('TicketsComponent', () => {
  beforeEach(() => localStorage.clear());

  it('réaffiche les billets enregistrés quand le réseau est coupé', async () => {
    const ticket = { id: 't1', ticket_number: 'TK-1', booking_id: 'b1', departure_id: 'd', seat_label: '1A',
      passenger_name: 'Awa', status: 'valid', qr_payload: 'BV1.x.y', issued_at: '', route_name: 'Cotonou → Parakou' };
    localStorage.setItem('bv-tickets-upcoming', JSON.stringify([ticket]));
    await TestBed.configureTestingModule({
      imports: [TicketsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(TicketsComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/v1/tickets')
      .error(new ProgressEvent('error'), { status: 0 });
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Hors connexion');
    expect(text).toContain('TK-1');
  });
});
