import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  it('affiche les indicateurs clés', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/v1/admin/dashboard').flush({
      from: '', to: '', revenue: 37500, tickets_sold: 3, cancellations: 0, refunds_amount: 0, pending_refunds: 2,
      average_fill_rate: 0.5, by_agency: [{ agency_id: 'a', agency_name: 'Jonquet', bookings: 2, revenue: 37500 }],
      by_category: [{ code: 'vip', name: 'VIP', seats_sold: 3, revenue: 37500 }], departures: [],
    });
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Jonquet');
    expect(text).toContain('VIP');
    expect(text.replace(/\s/g, '')).toContain('37500FCFA');
  });
});
