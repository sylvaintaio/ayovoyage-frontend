import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import {
  agentChangeDepartureStatus,
  blockDepartureSeat,
  changeDepartureStatus,
  getDeparture,
  getDepartureManifest,
  unblockDepartureSeat,
} from '../../../api/functions';
import { AdminDeparture, GetDepartureResponse, Manifest, SeatCell } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { SeatMapComponent } from '../../../shared/ui/seat-map/seat-map.component';
import { DepartureCargoComponent } from '../departure-cargo/departure-cargo.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { DepartureFormComponent } from '../departure-form/departure-form.component';

type Target = 'boarding' | 'departed' | 'arrived' | 'cancelled';

const NEXT: Record<string, Target[]> = {
  scheduled: ['boarding', 'departed', 'cancelled'],
  boarding: ['departed', 'cancelled'],
  departed: ['arrived'],
};

const ACTION_LABELS: Record<Target, string> = {
  boarding: "Ouvrir l'embarquement",
  departed: 'Déclarer le départ',
  arrived: "Déclarer l'arrivée",
  cancelled: 'Annuler le départ',
};

/** Exploitation d'un départ : plan nominatif, sièges bloqués, statut, manifeste. */
@Component({
  selector: 'bv-departure-detail',
  imports: [StateComponent, StatusBadgeComponent, SeatMapComponent, DepartureCargoComponent, FormsModule, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './departure-detail.component.html',
  styleUrl: './departure-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartureDetailComponent {
  private readonly api = inject(Api);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);

  readonly id = input.required<string>();

  protected readonly data = signal<GetDepartureResponse | null>(null);
  protected readonly manifest = signal<Manifest | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly seat = signal<SeatCell | null>(null);
  protected readonly blockReason = signal('');
  protected readonly busy = signal(false);

  protected readonly isManager = this.auth.hasRole('company_admin', 'agency_manager');
  protected readonly isField = this.auth.hasRole('company_admin', 'agency_manager', 'boarding_agent', 'driver');
  protected readonly actionLabels = ACTION_LABELS;

  protected readonly actions = computed(() => {
    const status = this.data()?.departure.status ?? '';
    return (NEXT[status] ?? []).filter((s) => this.isManager || s !== 'cancelled');
  });

  constructor() {
    effect(() => void this.load(this.id()));
  }

  protected async load(id: string): Promise<void> {
    this.loading.set(this.data() === null);
    this.error.set(null);
    try {
      this.data.set(await this.api.invoke(getDeparture, { id }));
      if (this.isField) {
        this.manifest.set(await this.api.invoke(getDepartureManifest, { id }));
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async changeStatus(status: Target): Promise<void> {
    const d = this.data()?.departure;
    if (!d) {
      return;
    }
    const cancelling = status === 'cancelled';
    const ok = await this.dialog.confirm({
      title: ACTION_LABELS[status] + ' ?',
      message: cancelling
        ? `Les ${d.sold_seats} réservation(s) seront annulées et remboursées intégralement. Les voyageurs sont prévenus par SMS.`
        : 'Les voyageurs seront prévenus par SMS.',
      confirmLabel: ACTION_LABELS[status],
      danger: cancelling,
    });
    if (!ok) {
      return;
    }
    this.busy.set(true);
    try {
      if (this.isManager) {
        const res = await this.api.invoke(changeDepartureStatus, { id: d.id, body: { status } });
        if (res.bookings_cancelled) {
          this.toast.info(`${res.bookings_cancelled} réservation(s) annulée(s), remboursements créés.`);
        }
      } else {
        await this.api.invoke(agentChangeDepartureStatus, { id: d.id, body: { status: status as 'boarding' | 'departed' | 'arrived' } });
      }
      this.toast.success('Statut mis à jour.');
      await this.load(d.id);
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected async edit(): Promise<void> {
    const d = this.data()?.departure;
    if (d && (await this.dialog.open<AdminDeparture>(DepartureFormComponent, d))) {
      this.toast.success('Départ modifié.');
      await this.load(d.id);
    }
  }

  protected async toggleBlock(): Promise<void> {
    const s = this.seat();
    const d = this.data()?.departure;
    if (!s || !d) {
      return;
    }
    this.busy.set(true);
    try {
      if (s.state === 'blocked') {
        await this.api.invoke(unblockDepartureSeat, { id: d.id, seat_id: s.id });
      } else {
        await this.api.invoke(blockDepartureSeat, { id: d.id, body: { seat_id: s.id, reason: this.blockReason() } });
      }
      this.seat.set(null);
      this.blockReason.set('');
      await this.load(d.id);
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
