import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  it('pré-remplit les règles commerciales', async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/admin/company').flush({
      id: 'c', name: 'Trans Express', slug: 'trans', currency: 'XOF', timezone: 'Africa/Porto-Novo', booking_hold_minutes: 12,
      sales_cutoff_minutes: 15, cancellation_cutoff_hours: 6, cancellation_fee_percent: 10, refund_approval_threshold: 50000,
    });
    await settle(fixture);
    expect((fixture.nativeElement.querySelector('#se-hold') as HTMLInputElement).value).toBe('12');
  });
});
