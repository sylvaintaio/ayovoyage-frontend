import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listDepartures, listRoutes } from '../../../api/functions';
import { AdminDeparture, Route } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { localDate } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { DepartureFormComponent, DepartureFormResult } from '../departure-form/departure-form.component';

type Status = 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled' | '';

@Component({
  selector: 'bv-departures',
  imports: [StateComponent, StatusBadgeComponent, FormsModule, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './departures.component.html',
  styleUrl: './departures.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeparturesComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthStore);

  protected readonly from = signal(localDate());
  protected readonly to = signal(localDate(6));
  protected readonly routeId = signal('');
  protected readonly status = signal<Status>('');
  protected readonly routes = signal<Route[]>([]);
  protected readonly departures = signal<AdminDeparture[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly canPlan = this.auth.hasRole('company_admin', 'agency_manager');

  async ngOnInit(): Promise<void> {
    if (this.canPlan) {
      this.api.invoke(listRoutes).then((r) => this.routes.set(r), () => undefined);
    }
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.departures.set(
        await this.api.invoke(listDepartures, {
          from: this.from(),
          to: this.to(),
          route_id: this.routeId() || undefined,
          status: this.status() || undefined,
        }),
      );
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async create(): Promise<void> {
    const created = await this.dialog.open<DepartureFormResult>(DepartureFormComponent, null);
    if (created && 'recurring' in created) {
      this.toast.success(`${created.recurring} départ(s) programmé(s).`);
      await this.load();
    } else if (created) {
      await this.router.navigate(['/admin/departs', created.id]);
    }
  }
}
