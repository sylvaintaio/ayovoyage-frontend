import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listMyTickets } from '../../../api/functions';
import { Ticket } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
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

  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly upcoming = signal(true);
  protected readonly offline = signal(false);

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
      const list = await this.api.invoke(listMyTickets, { upcoming: this.upcoming(), limit: 50 });
      this.tickets.set(list);
      this.offline.set(false);
      if (this.upcoming()) {
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
    } catch (err) {
      const cached = this.upcoming() ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        this.tickets.set(JSON.parse(cached) as Ticket[]);
        this.offline.set(true);
      } else {
        this.error.set(apiErrorMessage(err));
      }
    } finally {
      this.loading.set(false);
    }
  }
}
