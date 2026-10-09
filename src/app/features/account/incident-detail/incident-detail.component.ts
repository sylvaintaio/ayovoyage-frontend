import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { commentMyIncident, getMyIncident } from '../../../api/functions';
import { PublicIncident } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { INCIDENT_CATEGORY_LABELS } from '../../../shared/pipes/status';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

/** Réclamation du client : échanges avec le service client. */
@Component({
  selector: 'bv-my-incident',
  imports: [StateComponent, StatusBadgeComponent, FormsModule, RouterLink, DatePipe],
  templateUrl: './incident-detail.component.html',
  styleUrl: './incident-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyIncidentComponent {
  private readonly api = inject(Api);

  readonly id = input.required<string>();

  protected readonly incident = signal<PublicIncident | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal('');
  protected readonly sending = signal(false);
  protected readonly categories = INCIDENT_CATEGORY_LABELS;
  protected readonly open = computed(() => {
    const s = this.incident()?.status;
    return s === 'open' || s === 'in_progress';
  });

  constructor() {
    effect(() => void this.load(this.id()));
  }

  protected async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.incident.set(await this.api.invoke(getMyIncident, { id }));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Réclamation introuvable.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async send(): Promise<void> {
    const msg = this.message().trim();
    if (msg.length < 2) {
      return;
    }
    this.sending.set(true);
    try {
      this.incident.set(await this.api.invoke(commentMyIncident, { id: this.id(), body: { message: msg } }));
      this.message.set('');
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.sending.set(false);
    }
  }
}
