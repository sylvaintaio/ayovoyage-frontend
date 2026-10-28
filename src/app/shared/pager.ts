import { signal, WritableSignal } from '@angular/core';

/** Tranche demandée à l'API (paramètres `limit` et `offset`). */
export interface PageRequest {
  limit: number;
  offset: number;
}

/**
 * Liste chargée par tranches : `first()` recharge depuis le début, `next()` ajoute la tranche suivante.
 * Le décalage compte les éléments reçus du serveur : retirer une ligne de l'écran ne fait rien sauter.
 * Les erreurs remontent à l'appelant, qui les affiche.
 */
export class Pager<T> {
  readonly hasMore = signal(false);
  readonly loadingMore = signal(false);
  private fetched = 0;

  constructor(
    readonly items: WritableSignal<T[]>,
    private readonly fetch: (page: PageRequest) => Promise<T[]>,
    readonly size = 50,
  ) {}

  async first(): Promise<void> {
    const page = await this.fetch({ limit: this.size, offset: 0 });
    this.fetched = page.length;
    this.items.set(page);
    this.hasMore.set(page.length === this.size);
  }

  async next(): Promise<void> {
    if (!this.hasMore() || this.loadingMore()) {
      return;
    }
    this.loadingMore.set(true);
    try {
      const page = await this.fetch({ limit: this.size, offset: this.fetched });
      this.fetched += page.length;
      this.items.update((list) => [...list, ...page]);
      this.hasMore.set(page.length === this.size);
    } finally {
      this.loadingMore.set(false);
    }
  }
}
