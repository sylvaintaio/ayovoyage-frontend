import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { initialsOf } from '../../../core/layout/public-layout/public-layout.component';
import { formatE164 } from '../../auth/customer-login/customer-login.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

@Component({
  selector: 'bv-account-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './account-layout.component.html',
  styleUrl: './account-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLayoutComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly initials = computed(() => initialsOf(this.auth.displayName()));
  /** Téléphone s'il existe, sinon e-mail (comptes créés par e-mail). */
  protected readonly contact = computed(() => {
    const c = this.auth.me()?.customer;
    return c?.phone ? formatE164(c.phone) : (c?.email ?? '');
  });
  protected readonly links = [
    { path: 'reservations', label: 'Réservations' },
    { path: 'billets', label: 'Billets' },
    { path: 'fidelite', label: 'Fidélité' },
    { path: 'parrainage', label: 'Parrainage' },
    { path: 'colis', label: 'Colis' },
    { path: 'factures', label: 'Factures' },
    { path: 'messages', label: 'Messages' },
    { path: 'reclamations', label: 'Réclamations' },
    { path: 'proches', label: 'Proches' },
    { path: 'profil', label: 'Profil' },
  ];

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
