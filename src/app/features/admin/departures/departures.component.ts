import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
type Period = 'today' | 'tomorrow' | 'week' | 'day';

/** Jour de la liste : départs de ce jour, dans l'ordre. */
export interface DepartureDay {
  date: string;
  label: string;
  departures: AdminDeparture[];
}

/** Jour local (Bénin) d'un départ, au format AAAA-MM-JJ. */
export function beninDay(iso: string): string {
  return localDate(0, new Date(iso));
}

/** Départs regroupés par jour, avec « Aujourd'hui » et « Demain » en clair. */
export function groupByDay(list: AdminDeparture[], today: string): DepartureDay[] {
  const tomorrow = localDate(1, new Date(Date.parse(today + 'T12:00:00+01:00')));
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Porto-Novo' });
  const days = new Map<string, AdminDeparture[]>();
  for (const d of [...list].sort((a, b) => a.departure_at.localeCompare(b.departure_at))) {
    const key = beninDay(d.departure_at);
    days.set(key, [...(days.get(key) ?? []), d]);
  }
  return [...days].map(([date, departures]) => {
    const long = fmt.format(new Date(date + 'T12:00:00+01:00'));
    const label = date === today ? `Aujourd'hui · ${long}` : date === tomorrow ? `Demain · ${long}` : long[0].toUpperCase() + long.slice(1);
    return { date, label, departures };
  });
}

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

  protected readonly period = signal<Period>('today');
  /** Jour choisi (période « day ») ou premier jour affiché. */
  protected readonly day = signal(localDate());
  protected readonly routeId = signal('');
  protected readonly status = signal<Status>('');
  protected readonly routes = signal<Route[]>([]);
  protected readonly departures = signal<AdminDeparture[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly canPlan = this.auth.hasRole('company_admin', 'agency_manager');
  protected readonly today = localDate();
  protected readonly days = computed(() => groupByDay(this.departures(), this.today));
  protected readonly filtered = computed(() => !!this.routeId() || !!this.status());
  /** Départ « programmé » dont l'heure est passée depuis plus de 15 min : à vérifier (retard, statut oublié). */
  protected late(d: AdminDeparture): boolean {
    return d.status === 'scheduled' && Date.parse(d.departure_at) < Date.now() - 15 * 60_000;
  }

  protected fill(d: AdminDeparture): number {
    return d.seat_count ? Math.min(100, Math.round((d.peak_seats / d.seat_count) * 100)) : 0;
  }

  /** Période : aujourd'hui, demain, 7 jours, ou un jour précis. */
  protected setPeriod(p: Period, day?: string): void {
    this.period.set(p);
    this.day.set(day ?? (p === 'tomorrow' ? localDate(1) : localDate()));
    void this.load();
  }

  /** Jour précédent / suivant (vue « un jour »). */
  protected shift(days: number): void {
    const next = localDate(days, new Date(Date.parse(this.day() + 'T12:00:00+01:00')));
    this.setPeriod(next === this.today ? 'today' : next === localDate(1) ? 'tomorrow' : 'day', next);
  }

  protected resetFilters(): void {
    this.routeId.set('');
    this.status.set('');
    void this.load();
  }

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
          from: this.day(),
          to: this.period() === 'week' ? localDate(6, new Date(Date.parse(this.day() + 'T12:00:00+01:00'))) : this.day(),
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
