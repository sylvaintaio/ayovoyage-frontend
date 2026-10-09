import { ChangeDetectionStrategy, Component } from '@angular/core';

import { COMPANY } from '../../../../content/site-content';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

/** Moyens de paiement acceptés. */
@Component({
  selector: 'bv-payment-methods',
  imports: [IconComponent],
  templateUrl: './payment-methods.component.html',
  styleUrl: './payment-methods.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodsComponent {
  protected readonly methods = COMPANY.paymentMethods;
}
