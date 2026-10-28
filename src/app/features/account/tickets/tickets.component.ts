import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listMyTickets } from '../../../api/functions';
import { Ticket } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { Pager } from '../../../shared/pager';
import { LoadMoreComponent } from '../../../shared/ui/load-more/load-more.component';
import { QrCodeComponent } from '../../../shared/ui/qr-code/qr-code.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';

/** Billets à présenter à l'embarquement (conservés localement pour un usage sans réseau). */
@Component({
  selector: 'bv-tickets',
  imports: [
    ApiUrlPipe,
    StateComponent,
    LoadMoreComponent,
    StatusBadgeComponent,
    QrCodeComponent,
    FormsModule,
    RouterLink,
    DatePipe,
  ],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly upcoming = signal(true);
  protected readonly offline = signal(false);
  protected readonly pager = new Pager(this.tickets, (page) =>
    this.api.invoke(listMyTickets, { upcoming: this.upcoming(), ...page }),
  );

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async setUpcoming(value: boolean): Promise<void> {
    this.upcoming.set(value);
    await this.load();
  }

  protected async load(): Promise<void> {
    const cacheKey = 'bv-tickets-upcoming';
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.pager.first();
      this.offline.set(false);
      // Hors connexion : la première tranche des billets à venir reste consultable.
      if (this.upcoming()) {
        localStorage.setItem(cacheKey, JSON.stringify(this.tickets()));
      }
    } catch (err) {
      const cached = this.upcoming() ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        this.tickets.set(JSON.parse(cached) as Ticket[]);
        this.pager.hasMore.set(false);
        this.offline.set(true);
      } else {
        this.error.set(apiErrorMessage(err));
      }
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
