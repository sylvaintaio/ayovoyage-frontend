import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideRouter } from '@angular/router';

import { provideApiConfiguration } from '../../../api/api-configuration';
import { ConfirmationComponent } from './confirmation.component';

describe('ConfirmationComponent', () => {
  it('propose la simulation pour un paiement « mock » en attente', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmationComponent);
    fixture.componentRef.setInput('id', 'b1');
    fixture.componentRef.setInput('paiement', 'p1');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/payments/p1').flush({
      id: 'p1', booking_id: 'b1', provider: 'mock', method: 'mobile_money', amount: 12500, currency: 'XOF',
      status: 'pending', created_at: '',
    });
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Simuler un paiement réussi');
  });
});
