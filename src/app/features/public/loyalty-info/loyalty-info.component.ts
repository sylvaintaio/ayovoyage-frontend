import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShowcaseStore } from '../../../content/showcase.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CtaBandComponent } from '../sections/cta-band/cta-band.component';
import { FaqListComponent } from '../sections/faq-list/faq-list.component';
import { LoyaltyTiersComponent } from '../sections/loyalty-tiers/loyalty-tiers.component';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';

/** Présentation publique du programme de fidélité (règles réelles issues de l'API). */
@Component({
  selector: 'bv-loyalty-info',
  imports: [RouterLink, MoneyPipe, PageBannerComponent, LoyaltyTiersComponent, FaqListComponent, CtaBandComponent],
  templateUrl: './loyalty-info.component.html',
  styleUrl: './loyalty-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoyaltyInfoComponent {
  protected readonly store = inject(ShowcaseStore);
  protected readonly auth = inject(AuthStore);

  constructor() {
    void this.store.load();
  }
}
