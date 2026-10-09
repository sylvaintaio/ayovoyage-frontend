import { TestBed } from '@angular/core/testing';

import { COMPANY } from '../../../../content/site-content';
import { PaymentMethodsComponent } from './payment-methods.component';

describe('PaymentMethodsComponent', () => {
  it('liste les moyens de paiement du contenu éditorial', async () => {
    await TestBed.configureTestingModule({ imports: [PaymentMethodsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PaymentMethodsComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.chip').length).toBe(COMPANY.paymentMethods.length);
  });
});
