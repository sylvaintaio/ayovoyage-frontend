import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listBookings } from '../../../api/functions';
import { Booking } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CHANNEL_LABELS } from '../../../shared/pipes/status';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

type Status = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'refunded' | '';
const PAGE = 50;

/** Recherche de réservations (référence ou téléphone), tous canaux. */
@Component({
  selector: 'bv-admin-bookings',
  imports: [StateComponent, StatusBadgeComponent, FormsModule, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBookingsComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly q = signal('');
  protected readonly status = signal<Status>('');
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly hasMore = signal(false);
  protected readonly channels = CHANNEL_LABELS;

  async ngOnInit(): Promise<void> {
    await this.load(true);
  }

  protected async load(reset = false): Promise<void> {
    this.loading.set(reset);
    this.error.set(null);
    try {
      const page = await this.api.invoke(listBookings, {
        q: this.normalizedQuery() || undefined,
        status: this.status() || undefined,
        limit: PAGE,
        offset: reset ? 0 : this.bookings().length,
      });
      this.bookings.set(reset ? page : [...this.bookings(), ...page]);
      this.hasMore.set(page.length === PAGE);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** Accepte une référence ou un numéro béninois saisi librement. */
  private normalizedQuery(): string {
    const q = this.q().trim();
    const digits = q.replace(/[\s.-]/g, '');
    if (/^\+?\d{8,15}$/.test(digits)) {
      if (digits.startsWith('+')) {
        return digits;
      }
      return digits.startsWith('229') ? `+${digits}` : `+229${digits}`;
    }
    return q.toUpperCase();
  }
}
