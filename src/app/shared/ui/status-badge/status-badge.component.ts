import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusDomain, statusInfo } from '../../pipes/status';

/** Pastille colorée pour un statut (réservation, billet, départ…). */
@Component({
  selector: 'bv-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<string | null | undefined>();
  readonly domain = input.required<StatusDomain>();
  protected readonly info = computed(() => statusInfo(this.domain(), this.status()));
}
