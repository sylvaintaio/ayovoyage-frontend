import { DatePipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { getDashboard } from '../../../api/functions';
import { Dashboard } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { localDate } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Indicateurs clés : chiffre d'affaires, billets, remplissage, agences, catégories. */
@Component({
  selector: 'bv-dashboard',
  imports: [StateComponent, FormsModule, RouterLink, DatePipe, PercentPipe, MoneyPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly from = signal(localDate(-30));
  protected readonly to = signal(localDate());
  protected readonly data = signal<Dashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly maxAgencyRevenue = computed(() => Math.max(1, ...(this.data()?.by_agency.map((a) => a.revenue) ?? [1])));
  protected readonly maxCategorySeats = computed(() => Math.max(1, ...(this.data()?.by_category.map((c) => c.seats_sold) ?? [1])));

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async setPeriod(days: number): Promise<void> {
    this.from.set(localDate(-days));
    this.to.set(localDate());
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.data.set(await this.api.invoke(getDashboard, { from: this.from(), to: this.to() }));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
