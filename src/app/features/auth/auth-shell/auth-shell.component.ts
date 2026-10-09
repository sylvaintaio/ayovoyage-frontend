import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { COMPANY } from '../../../content/site-content';
import { BrandMarkComponent } from '../../../shared/ui/brand-mark/brand-mark.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { BoardingPassComponent } from '../boarding-pass/boarding-pass.component';

/**
 * Mise en page des écrans de connexion : panneau de marque à gauche
 * (masqué sur mobile), formulaire à droite.
 */
@Component({
  selector: 'bv-auth-shell',
  imports: [RouterLink, IconComponent, BoardingPassComponent, BrandMarkComponent],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShellComponent {
  /** customer : voyageurs ; staff : personnel (back-office). */
  readonly variant = input<'customer' | 'staff'>('customer');
  protected readonly company = COMPANY;
  protected readonly year = new Date().getFullYear();
}
