import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listMyBookings } from '../../../api/functions';
import { Booking } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

const PAGE = 20;

@Component({
  selector: 'bv-bookings',
  imports: [StateComponent, StatusBadgeComponent, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly hasMore = signal(false);

  async ngOnInit(): Promise<void> {
    await this.load(true);
  }

  protected async load(reset = false): Promise<void> {
    this.loading.set(reset);
    this.error.set(null);
    try {
      const offset = reset ? 0 : this.bookings().length;
      const page = await this.api.invoke(listMyBookings, { limit: PAGE, offset });
      this.bookings.set(reset ? page : [...this.bookings(), ...page]);
      this.hasMore.set(page.length === PAGE);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
