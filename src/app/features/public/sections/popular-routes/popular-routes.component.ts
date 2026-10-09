import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShowcaseStore } from '../../../../content/showcase.store';
import { formatDuration, localDate } from '../../../../shared/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

/** Lignes phares avec tarif « à partir de », durée et fréquence. */
@Component({
  selector: 'bv-popular-routes',
  imports: [RouterLink, MoneyPipe, IconComponent],
  templateUrl: './popular-routes.component.html',
  styleUrl: './popular-routes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopularRoutesComponent {
  private readonly store = inject(ShowcaseStore);
  readonly limit = input(6);
  protected readonly routes = computed(() => this.store.routes().slice(0, this.limit()));
  protected readonly duration = formatDuration;
  protected readonly tomorrow = localDate(1);

  constructor() {
    void this.store.load();
  }
}
