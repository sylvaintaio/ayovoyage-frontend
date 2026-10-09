import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { RefundsComponent } from './refunds.component';

describe('RefundsComponent', () => {
  it('affiche les remboursements à traiter avec leurs actions', async () => {
    await TestBed.configureTestingModule({
      imports: [RefundsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(RefundsComponent);
    fixture.detectChanges();
    const req = TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/v1/admin/refunds');
    expect(req.request.params.get('status')).toBe('requested');
    req.flush([{ id: 'r1', booking_id: 'b1', booking_reference: 'BV123', amount: 10800, reason: 'Changement de programme',
      status: 'requested', requested_by_type: 'customer', created_at: '2026-10-08T09:00:00Z' }]);
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('BV123');
    expect(text).toContain('Approuver');
  });
});
