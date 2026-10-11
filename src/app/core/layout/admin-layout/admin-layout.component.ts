import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

import { Api } from '../../../api/api';
import { getMyMfa } from '../../../api/functions';
import { MfaStatus } from '../../../api/models';
import { BrandMarkComponent } from '../../../shared/ui/brand-mark/brand-mark.component';
import { AuthStore, ROLE_LABELS, StaffRole } from '../../auth/auth.store';

interface NavItem {
  label: string;
  link: string;
  roles?: StaffRole[];
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ADMIN: StaffRole[] = ['company_admin'];
const MANAGERS: StaffRole[] = ['company_admin', 'agency_manager'];

/** Menu du back-office : chaque entrée n'apparaît qu'aux rôles concernés. */
const NAV: NavGroup[] = [
  {
    title: 'Exploitation',
    items: [
      { label: 'Tableau de bord', link: '/admin', exact: true, roles: ['company_admin', 'agency_manager', 'finance'] },
      { label: 'Vente au guichet', link: '/admin/guichet', roles: ['company_admin', 'agency_manager', 'cashier'] },
      { label: 'À encaisser', link: '/admin/encaisser', roles: ['company_admin', 'agency_manager', 'cashier'] },
      { label: 'Caisse', link: '/admin/caisse', roles: ['company_admin', 'agency_manager', 'cashier', 'finance'] },
      { label: 'Départs', link: '/admin/departs' },
      { label: 'Réservations', link: '/admin/reservations', roles: ['company_admin', 'agency_manager', 'cashier', 'finance'] },
      { label: 'Remboursements', link: '/admin/remboursements', roles: ['company_admin', 'agency_manager', 'finance'] },
      { label: 'Factures', link: '/admin/factures', roles: ['company_admin', 'agency_manager', 'finance'] },
    ],
  },
  {
    title: 'Colis et bagages',
    items: [
      { label: 'Colis', link: '/admin/colis', roles: ['company_admin', 'agency_manager', 'cashier', 'parcel_agent', 'boarding_agent', 'driver'] },
      { label: 'Réclamations', link: '/admin/reclamations', roles: ['company_admin', 'agency_manager', 'cashier', 'parcel_agent'] },
    ],
  },
  {
    title: 'Réseau et flotte',
    items: [
      { label: 'Agences', link: '/admin/agences', roles: MANAGERS },
      { label: 'Lignes', link: '/admin/lignes', roles: ADMIN },
      { label: "Points d'arrêt", link: '/admin/points-arret', roles: ADMIN },
      { label: 'Bus', link: '/admin/bus', roles: ADMIN },
      { label: 'Plans de sièges', link: '/admin/plans', roles: ADMIN },
      { label: 'Catégories de sièges', link: '/admin/categories', roles: ADMIN },
    ],
  },
  {
    title: 'Clients',
    items: [
      { label: 'Fidélité', link: '/admin/fidelite', roles: ['company_admin', 'finance'] },
      { label: 'Promotions', link: '/admin/promotions', roles: ['company_admin', 'agency_manager', 'finance'] },
      { label: 'Avis', link: '/admin/avis', roles: ['company_admin', 'agency_manager'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Personnel', link: '/admin/personnel', roles: MANAGERS },
      { label: 'Terminaux', link: '/admin/terminaux', roles: MANAGERS },
      { label: "Journal d'audit", link: '/admin/journal', roles: ['company_admin', 'finance'] },
      { label: 'Paramètres', link: '/admin/parametres', roles: ADMIN },
      { label: 'Sécurité du compte', link: '/admin/securite' },
    ],
  },
];

@Component({
  selector: 'bv-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe, BrandMarkComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent implements OnInit {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly api = inject(Api);
  protected readonly sidebarOpen = signal(false);
  protected readonly mfa = signal<MfaStatus | null>(null);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly onSecurityPage = computed(() => this.url().startsWith('/admin/securite'));
  /** Rappel tant que la double authentification n'est pas activée (période de grâce). */
  protected readonly mfaReminder = computed(() => {
    const m = this.mfa();
    return m && m.required && !m.enabled ? m : null;
  });

  protected readonly nav = computed(() =>
    NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || this.auth.hasRole(...i.roles)) })).filter(
      (g) => g.items.length > 0,
    ),
  );
  protected readonly roleLabel = computed(() => {
    const r = this.auth.role();
    return r ? ROLE_LABELS[r] : '';
  });

  async ngOnInit(): Promise<void> {
    if (this.auth.isStaff()) {
      try {
        this.mfa.set(await this.api.invoke(getMyMfa));
      } catch {
        // le rappel est facultatif
      }
    }
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/admin/connexion');
  }
}
