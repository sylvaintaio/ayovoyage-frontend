import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { commentIncident, getIncident, listStaff, updateIncident } from '../../../api/functions';
import { IncidentDetail, Staff } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { INCIDENT_CATEGORY_LABELS, INCIDENT_SUBJECT_LABELS } from '../../../shared/pipes/status';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';

type Status = 'open' | 'in_progress' | 'resolved' | 'rejected';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

const ACTIONS: Record<string, string> = {
  created: 'Dossier ouvert',
  comment: 'Message',
  status: 'Statut',
  priority: 'Priorité',
  assigned: 'Attribution',
};

/** Dossier de réclamation : traitement, échanges avec le client et notes internes. */
@Component({
  selector: 'bv-incident-detail',
  imports: [ApiUrlPipe, StateComponent, StatusBadgeComponent, FormsModule, RouterLink, DatePipe],
  templateUrl: './incident-detail.component.html',
  styleUrl: './incident-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentDetailComponent {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthStore);

  readonly id = input.required<string>();

  protected readonly incident = signal<IncidentDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly staff = signal<Staff[]>([]);
  protected readonly categories = INCIDENT_CATEGORY_LABELS;
  protected readonly subjects = INCIDENT_SUBJECT_LABELS;
  protected readonly actions = ACTIONS;

  protected readonly status = signal<Status>('open');
  protected readonly priority = signal<Priority>('normal');
  protected readonly assignedTo = signal('');
  protected readonly resolution = signal('');
  protected readonly message = signal('');
  protected readonly isPublic = signal(true);

  protected readonly closing = computed(
    () => this.status() === 'resolved' || this.status() === 'rejected',
  );
  protected readonly events = computed(() => [...(this.incident()?.events ?? [])].reverse());

  constructor() {
    effect(() => void this.load(this.id()));
    if (this.auth.hasRole('company_admin', 'agency_manager')) {
      this.api.invoke(listStaff).then(
        (s) => this.staff.set(s.filter((x) => x.is_active)),
        () => undefined,
      );
    }
  }

  protected async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.set(await this.api.invoke(getIncident, { id }));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Réclamation introuvable.'));
    } finally {
      this.loading.set(false);
    }
  }

  private set(i: IncidentDetail): void {
    this.incident.set(i);
    this.status.set(i.status as Status);
    this.priority.set((i.priority ?? 'normal') as Priority);
    this.assignedTo.set(i.assigned_to ?? '');
    this.resolution.set(i.resolution);
  }

  protected assignToMe(): void {
    this.assignedTo.set(this.auth.me()?.staff?.id ?? '');
    if (this.status() === 'open') {
      this.status.set('in_progress');
    }
  }

  protected async save(): Promise<void> {
    if (this.closing() && this.resolution().trim().length < 5) {
      this.toast.error('Décrivez la solution apportée au client.');
      return;
    }
    this.busy.set(true);
    try {
      this.set(
        await this.api.invoke(updateIncident, {
          id: this.id(),
          body: {
            status: this.status(),
            priority: this.priority(),
            assigned_to: this.assignedTo() || undefined,
            resolution: this.resolution().trim() || undefined,
          },
        }),
      );
      this.toast.success(
        this.closing() ? 'Dossier clos, le client est prévenu par SMS.' : 'Dossier mis à jour.',
      );
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected async comment(): Promise<void> {
    const msg = this.message().trim();
    if (msg.length < 2) {
      return;
    }
    this.busy.set(true);
    try {
      this.set(
        await this.api.invoke(commentIncident, {
          id: this.id(),
          body: { message: msg, public: this.isPublic() },
        }),
      );
      this.message.set('');
      this.toast.success(this.isPublic() ? 'Message envoyé au client.' : 'Note interne ajoutée.');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
