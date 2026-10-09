import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { BRAND } from '../../content/brand';

/**
 * Ajoute le nom de la marque au titre de chaque route :
 *   « Mes billets » → « Mes billets — BUS-VOYAGE »
 *   back-office     → « Départs — Back-office BUS-VOYAGE »
 *   sans titre      → « BUS-VOYAGE — Réservez votre voyage en bus »
 */
@Injectable({ providedIn: 'root' })
export class BrandTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(brandTitle(this.buildTitle(snapshot), snapshot.url));
  }
}

export function brandTitle(page: string | undefined, url = '/'): string {
  if (!page) {
    return `${BRAND.name} — ${BRAND.tagline}`;
  }
  return url.startsWith('/admin') ? `${page} — Back-office ${BRAND.name}` : `${page} — ${BRAND.name}`;
}
