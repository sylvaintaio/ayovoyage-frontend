import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listMyIncidents } from '../../../api/functions';
import { IncidentSummary } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { INCIDENT_CATEGORY_LABELS, INCIDENT_SUBJECT_LABELS } from '../../../shared/pipes/status';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

/** Réclamations du client. */
@Component({
  selector: 'bv-my-incidents',
  imports: [StateComponent, StatusBadgeComponent, RouterLink, DatePipe],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyIncidentsComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly incidents = signal<IncidentSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly categories = INCIDENT_CATEGORY_LABELS;
  protected readonly subjects = INCIDENT_SUBJECT_LABELS;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.incidents.set(await this.api.invoke(listMyIncidents));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
