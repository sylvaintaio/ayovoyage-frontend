import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ShowcaseStore } from '../../../../content/showcase.store';

/** Niveaux du programme de fidélité, avec réductions et avantages réels. */
@Component({
  selector: 'bv-loyalty-tiers',
  templateUrl: './loyalty-tiers.component.html',
  styleUrl: './loyalty-tiers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoyaltyTiersComponent {
  protected readonly store = inject(ShowcaseStore);

  constructor() {
    void this.store.load();
  }

  /** Indices 0…n-1 pour les barres de niveau. */
  protected steps(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }
}
