import { Injectable, computed, inject, signal } from '@angular/core';

import { Api } from '../api/api';
import { getShowcase } from '../api/functions';
import { Showcase } from '../api/models';

/** Données réelles de la vitrine (chiffres, lignes, offres, fidélité), chargées une fois. */
@Injectable({ providedIn: 'root' })
export class ShowcaseStore {
  private readonly api = inject(Api);
  private loading: Promise<void> | null = null;

  readonly data = signal<Showcase | null>(null);
  readonly stats = computed(() => this.data()?.stats ?? null);
  readonly routes = computed(() => this.data()?.routes ?? []);
  readonly tiers = computed(() => this.data()?.loyalty_tiers ?? []);
  readonly loyalty = computed(() => this.data()?.loyalty ?? null);

  /** Offres de sièges dédoublonnées par code, de la plus confortable à la plus simple. */
  readonly offers = computed(() => {
    const seen = new Set<string>();
    return (this.data()?.offers ?? []).filter((o) => !seen.has(o.code) && seen.add(o.code));
  });

  load(): Promise<void> {
    this.loading ??= this.api
      .invoke(getShowcase)
      .then((d) => this.data.set(d))
      .catch(() => {
        this.loading = null;
      });
    return this.loading;
  }
}
