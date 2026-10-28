import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listMyIncidents } from '../../../api/functions';
import { IncidentSummary } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { INCIDENT_CATEGORY_LABELS, INCIDENT_SUBJECT_LABELS } from '../../../shared/pipes/status';
import { Pager } from '../../../shared/pager';
import { LoadMoreComponent } from '../../../shared/ui/load-more/load-more.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

/** Réclamations du client. */
@Component({
  selector: 'bv-my-incidents',
  imports: [StateComponent, LoadMoreComponent, StatusBadgeComponent, RouterLink, DatePipe],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyIncidentsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly incidents = signal<IncidentSummary[]>([]);
  protected readonly pager = new Pager(this.incidents, (page) =>
    this.api.invoke(listMyIncidents, page),
  );
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
      await this.pager.first();
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async more(): Promise<void> {
    try {
      await this.pager.next();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
