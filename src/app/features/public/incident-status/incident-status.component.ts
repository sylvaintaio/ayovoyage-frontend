import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { getPublicIncident } from '../../../api/functions';
import { PublicIncident } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { INCIDENT_CATEGORY_LABELS } from '../../../shared/pipes/status';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { TimelineComponent, TimelineItem } from '../../../shared/ui/timeline/timeline.component';

const ACTIONS: Record<string, string> = { created: 'Réclamation enregistrée', comment: 'Message', status: 'Mise à jour du dossier' };

/** Suivi public d'une réclamation : accès avec le téléphone du déclarant. */
@Component({
  selector: 'bv-incident-status',
  imports: [FormsModule, RouterLink, DatePipe, StatusBadgeComponent, TimelineComponent],
  templateUrl: './incident-status.component.html',
  styleUrl: './incident-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentStatusComponent {
  private readonly api = inject(Api);

  readonly reference = input.required<string>();

  protected readonly phone = signal('');
  protected readonly incident = signal<PublicIncident | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly categories = INCIDENT_CATEGORY_LABELS;
  protected readonly events = computed<TimelineItem[]>(() =>
    [...(this.incident()?.events ?? [])].reverse().map((e, i) => ({
      label: e.author_type === 'staff' ? `${ACTIONS[e.action] ?? 'Message'} — service client` : (ACTIONS[e.action] ?? 'Message'),
      at: e.created_at,
      note: e.note,
      tone: i === 0 ? 'current' : 'done',
    })),
  );

  protected async open(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.incident.set(await this.api.invoke(getPublicIncident, { reference: this.reference(), phone: this.phone() }));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Dossier introuvable avec ce numéro.'));
    } finally {
      this.busy.set(false);
    }
  }
}
