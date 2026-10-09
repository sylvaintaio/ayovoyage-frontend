import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ShowcaseStore } from '../../../../content/showcase.store';

/** Chiffres clés réels (issus de l'API). Les valeurs nulles ne sont jamais affichées. */
@Component({
  selector: 'bv-stats-band',
  templateUrl: './stats-band.component.html',
  styleUrl: './stats-band.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsBandComponent {
  private readonly store = inject(ShowcaseStore);

  protected readonly items = computed(() => {
    const s = this.store.stats();
    if (!s) {
      return [];
    }
    return [
      { value: s.cities, label: 'villes desservies' },
      { value: s.agencies, label: 'agences' },
      { value: s.routes, label: 'lignes régulières' },
      { value: s.departures_next_7_days, label: 'départs cette semaine' },
      { value: s.passengers_carried, label: 'voyageurs transportés' },
    ].filter((i) => i.value > 0);
  });

  constructor() {
    void this.store.load();
  }
}
