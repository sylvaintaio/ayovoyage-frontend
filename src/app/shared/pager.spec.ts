import { signal } from '@angular/core';

import { Pager } from './pager';

describe('Pager', () => {
  const all = Array.from({ length: 7 }, (_, i) => i);
  const slice = async ({ limit, offset }: { limit: number; offset: number }) =>
    all.slice(offset, offset + limit);
  const fetch = vi.fn(slice);

  // Accolades : une fonction renvoyée par beforeEach serait appelée comme nettoyage.
  beforeEach(() => {
    fetch.mockReset().mockImplementation(slice);
  });

  it('charge par tranches jusqu’à la dernière', async () => {
    const pager = new Pager(signal<number[]>([]), fetch, 3);
    await pager.first();
    expect(pager.items()).toEqual([0, 1, 2]);
    expect(pager.hasMore()).toBe(true);
    await pager.next();
    await pager.next();
    expect(pager.items()).toEqual(all);
    expect(pager.hasMore()).toBe(false);
    await pager.next();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('une ligne retirée de l’écran ne décale pas la tranche suivante', async () => {
    const items = signal<number[]>([]);
    const pager = new Pager(items, fetch, 3);
    await pager.first();
    items.update((l) => l.filter((x) => x !== 1));
    await pager.next();
    expect(fetch).toHaveBeenLastCalledWith({ limit: 3, offset: 3 });
    expect(items()).toEqual([0, 2, 3, 4, 5]);
  });

  it('échec : l’erreur remonte, on peut réessayer', async () => {
    const pager = new Pager(signal<number[]>([]), fetch, 3);
    await pager.first();
    fetch.mockRejectedValueOnce(new Error('réseau'));
    await expect(pager.next()).rejects.toThrow('réseau');
    expect(pager.loadingMore()).toBe(false);
    expect(pager.hasMore()).toBe(true);
  });
});
