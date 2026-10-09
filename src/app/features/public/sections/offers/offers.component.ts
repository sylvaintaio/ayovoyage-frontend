import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ShowcaseStore } from '../../../../content/showcase.store';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

/** Classes de confort (Standard, Premium, VIP), telles que configurées par la compagnie. */
@Component({
  selector: 'bv-offers',
  imports: [MoneyPipe],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffersComponent {
  private readonly store = inject(ShowcaseStore);
  /** Du plus simple au plus confortable. */
  protected readonly offers = computed(() => [...this.store.offers()].sort((a, b) => a.surcharge_amount - b.surcharge_amount));
  protected readonly featured = computed(() => this.offers().at(-1)?.code);

  constructor() {
    void this.store.load();
  }
}
