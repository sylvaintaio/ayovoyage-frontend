import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShowcaseStore } from '../../../content/showcase.store';
import { formatDuration, localDate } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CtaBandComponent } from '../sections/cta-band/cta-band.component';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';
import { PopularRoutesComponent } from '../sections/popular-routes/popular-routes.component';

/** Lignes et tarifs par classe. */
@Component({
  selector: 'bv-lines',
  imports: [RouterLink, MoneyPipe, PageBannerComponent, PopularRoutesComponent, CtaBandComponent],
  templateUrl: './lines.component.html',
  styleUrl: './lines.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinesComponent {
  protected readonly store = inject(ShowcaseStore);
  protected readonly duration = formatDuration;
  protected readonly tomorrow = localDate(1);
  protected readonly offers = computed(() => [...this.store.offers()].sort((a, b) => a.surcharge_amount - b.surcharge_amount));

  constructor() {
    void this.store.load();
  }
}
