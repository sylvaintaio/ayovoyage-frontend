import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listIncidents } from '../../../api/functions';
import { IncidentSummary } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { INCIDENT_CATEGORY_LABELS, INCIDENT_SUBJECT_LABELS } from '../../../shared/pipes/status';
import { Pager } from '../../../shared/pager';
import { LoadMoreComponent } from '../../../shared/ui/load-more/load-more.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

/** File des réclamations (colis, bagages, voyages), triée par priorité. */
@Component({
  selector: 'bv-incidents',
  imports: [
    StateComponent,
    LoadMoreComponent,
    StatusBadgeComponent,
    FormsModule,
    RouterLink,
    DatePipe,
  ],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly status = signal('open');
  protected readonly subject = signal('');
  protected readonly incidents = signal<IncidentSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly categories = INCIDENT_CATEGORY_LABELS;
  protected readonly subjects = INCIDENT_SUBJECT_LABELS;
  protected readonly pager = new Pager(this.incidents, (page) =>
    this.api.invoke(listIncidents, {
      status: (this.status() || undefined) as never,
      subject: (this.subject() || undefined) as never,
      ...page,
    }),
  );

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
