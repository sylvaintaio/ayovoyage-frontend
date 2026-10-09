import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { COMPANY } from '../../../content/site-content';
import { whatsappUrl } from '../../../features/public/agency-utils';
import { BrandMarkComponent } from '../../../shared/ui/brand-mark/brand-mark.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { AuthStore } from '../../auth/auth.store';

interface NavLink {
  label: string;
  link: string;
  fragment?: string;
}

interface NavGroup {
  id: 'voyager';
  label: string;
  links: NavLink[];
}

/** Menu déroulant « Voyager ». */
const GROUPS: NavGroup[] = [
  {
    id: 'voyager',
    label: 'Voyager',
    links: [
      { label: 'Lignes et tarifs', link: '/lignes' },
      { label: 'Classes VIP et Premium', link: '/services' },
      { label: 'Groupes et entreprises', link: '/contact' },
    ],
  },
];

/** Heure courante au Bénin (UTC+1, sans heure d'été). */
function beninHour(now: Date): number {
  return (now.getUTCHours() + 1) % 24 + now.getUTCMinutes() / 60;
}

/** Gabarit du site public : barre de service, barre « quai » collante, pied de page, bouton WhatsApp. */
@Component({
  selector: 'bv-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, BrandMarkComponent],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeAll()',
  },
})
export class PublicLayoutComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly menuOpen = signal(false);
  protected readonly openGroup = signal<NavGroup['id'] | null>(null);
  protected readonly year = new Date().getFullYear();
  protected readonly company = COMPANY;
  protected readonly whatsapp = whatsappUrl(COMPANY.whatsapp);
  protected readonly tel = 'tel:' + COMPANY.phone.replace(/\s/g, '');
  protected readonly groups = GROUPS;

  /** Liens directs de la barre (entre les deux menus). */
  protected readonly direct: NavLink[] = [
    { label: 'Colis', link: '/colis' },
    { label: 'Fidélité', link: '/fidelite' },
    { label: 'Agences', link: '/agences' },
    { label: 'Aide', link: '/faq' },
    { label: 'À propos', link: '/a-propos' },
    { label: 'Contact', link: '/contact' },
  ];

  /** Service client ouvert maintenant ? (rafraîchi chaque minute) */
  private readonly now = signal(new Date());
  protected readonly serviceOpen = computed(() => {
    const h = beninHour(this.now());
    return h >= COMPANY.serviceHours.open && h < COMPANY.serviceHours.close;
  });
  protected readonly serviceHours = COMPANY.serviceHours;

  protected readonly initials = computed(() => initialsOf(this.auth.displayName()));
  /** Coordonnées encore à compléter dans le contenu éditorial : non affichées. */
  protected readonly address = COMPANY.address.includes('[À COMPLÉTER]') ? '' : COMPANY.address;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Un menu est « actif » si la page courante fait partie de ses liens. */
  protected groupActive(g: NavGroup): boolean {
    const path = this.url().split(/[?#]/)[0];
    return g.links.some((l) => path === l.link || path.startsWith(l.link + '/'));
  }

  constructor() {
    // Ancres (#reserver, #suivi) : s'arrêter sous la barre collante (64 px) avec une marge.
    inject(ViewportScroller).setOffset([0, 80]);
    const timer = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.closeAll());
  }

  protected toggleGroup(id: NavGroup['id']): void {
    this.openGroup.update((cur) => (cur === id ? null : id));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    this.openGroup.set(null);
  }

  protected closeAll(): void {
    this.menuOpen.set(false);
    this.openGroup.set(null);
  }

  protected onDocumentClick(event: MouseEvent): void {
    const header = this.host.nativeElement.querySelector('.header');
    if (this.openGroup() && header && !header.contains(event.target as Node)) {
      this.openGroup.set(null);
    }
  }
}

/** « Mariam Adjovi » → « MA ». */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}
