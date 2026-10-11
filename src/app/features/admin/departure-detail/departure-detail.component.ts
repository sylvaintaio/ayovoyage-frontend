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

const REASONS: Record<string, string> = {
  police: 'Contrôle de police',
  breakdown: 'Panne',
  puncture: 'Crevaison',
  pause: 'Pause non prévue',
  traffic: 'Embouteillage',
  other: 'Autre',
};

/** Ligne de la frise du voyage : arrêt prévu (avec ses heures réelles) ou arrêt imprévu. */
export interface TimelineItem {
  kind: 'planned' | 'unplanned';
  name: string;
  scheduledAt?: string;
  arrivedAt?: string;
  departedAt?: string;
  pauseMinutes?: number;
  /** Écart en minutes avec l'heure prévue (arrivée réelle − prévue). */
  delay?: number;
  /** Durée réelle de l'arrêt en minutes. */
  stayMinutes?: number;
  reason?: string;
  note?: string;
  position?: string;
  mocked?: boolean;
}

const minutes = (a: string, b: string) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 60000);

/** Frise du voyage : arrêts prévus et imprévus dans l'ordre réel, avec retards et durées. */
export function buildTimeline(d: AdminDeparture): TimelineItem[] {
  const visits = d.visits ?? [];
  const items: (TimelineItem & { key: number })[] = [];
  for (const s of d.stops ?? []) {
    const v = visits.find((x) => x.seq === s.seq);
    const item: TimelineItem & { key: number } = {
      kind: 'planned', name: s.stop_name, scheduledAt: s.scheduled_at, pauseMinutes: s.pause_minutes,
      key: new Date(v?.arrived_at ?? s.scheduled_at).getTime(),
    };
    if (v) {
      item.arrivedAt = v.arrived_at;
      item.departedAt = v.departed_at;
      item.delay = minutes(s.seq === 0 && v.departed_at ? v.departed_at : v.arrived_at, s.scheduled_at);
      item.stayMinutes = v.departed_at ? minutes(v.departed_at, v.arrived_at) : undefined;
      item.mocked = v.mocked;
      if (v.latitude != null && v.longitude != null) item.position = `${v.latitude.toFixed(5)}, ${v.longitude.toFixed(5)}`;
    }
    items.push(item);
  }
  for (const v of visits.filter((x) => x.seq == null)) {
    items.push({
      kind: 'unplanned', name: REASONS[v.reason] ?? v.reason, reason: v.reason, note: v.note, arrivedAt: v.arrived_at,
      departedAt: v.departed_at, stayMinutes: v.departed_at ? minutes(v.departed_at, v.arrived_at) : undefined, mocked: v.mocked,
      position: v.latitude != null && v.longitude != null ? `${v.latitude.toFixed(5)}, ${v.longitude.toFixed(5)}` : undefined,
      key: new Date(v.arrived_at).getTime(),
    });
  }
  return items
    .sort((a, b) => a.key - b.key)
    .map((item) => {
      const { key, ...rest } = item;
      void key;
      return rest;
    });
}

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

  protected readonly timeline = computed(() => {
    const d = this.data()?.departure;
    return d ? buildTimeline(d) : [];
  });

  /** « Bohicon → Parakou » pour un passager du manifeste. */
  protected trip(boarding: number, alighting: number): string {
    const stops = this.manifest()?.stops ?? [];
    const name = (seq: number) => stops.find((s) => s.seq === seq)?.city_name ?? '';
    return stops.length > 2 ? `${name(boarding)} → ${name(alighting)}` : '';
  }

  protected readonly crewRoles: Record<string, string> = { controller: 'Contrôleur', driver: 'Chauffeur', assistant: 'Aide' };

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
