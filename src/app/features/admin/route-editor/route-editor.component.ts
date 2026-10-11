import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { createRoute, listRoutes, listStopPoints, updateRoute } from '../../../api/functions';
import { Route, RouteFare, StopPoint } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { formatDuration } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Arrêt en cours d'édition : heure de passage « HH:MM » pour un départ de référence. */
export interface StopRow {
  stop_point_id: string;
  time: string;
  pause_minutes: number;
  can_board: boolean;
  can_alight: boolean;
}

/** Minutes depuis le départ, à partir des heures saisies (passage minuit géré : +24 h). */
export function offsetsFromTimes(times: string[]): number[] {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const out: number[] = [];
  let day = 0;
  let prev = -1;
  const start = toMin(times[0] ?? '00:00');
  for (const t of times) {
    let abs = toMin(t) + day;
    if (prev >= 0 && abs <= prev) {
      day += 24 * 60;
      abs += 24 * 60;
    }
    out.push(abs - start);
    prev = abs;
  }
  return out;
}

/** « HH:MM » à partir d'une heure de départ et d'un décalage en minutes. */
export function timeAt(departure: string, offset: number): string {
  const [h, m] = departure.split(':').map(Number);
  const total = ((h || 0) * 60 + (m || 0) + offset) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Éditeur d'une ligne : arrêts dans l'ordre (heure de passage, pause, montée, descente),
 * prix unique ou grille de ville à ville. Les départs déjà programmés ne sont pas modifiés.
 */
@Component({
  selector: 'bv-route-editor',
  imports: [StateComponent, FormsModule, RouterLink, MoneyPipe],
  templateUrl: './route-editor.component.html',
  styleUrl: './route-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteEditorComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Paramètre de route : identifiant de la ligne ou « nouvelle ». */
  readonly id = input<string>('nouvelle');

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly points = signal<StopPoint[]>([]);
  protected readonly duration = formatDuration;

  protected readonly name = signal('');
  protected readonly basePrice = signal(5000);
  protected readonly mode = signal<'flat' | 'grid'>('flat');
  protected readonly baggage = signal(20);
  protected readonly distance = signal<number | null>(null);
  protected readonly active = signal(true);
  protected readonly departureTime = signal('07:00');
  protected readonly stops = signal<StopRow[]>([]);
  /** Grille : « villeMontée|villeDescente » → montant (vide = prix complet). */
  protected readonly fares = signal<Record<string, number | null>>({});

  protected readonly isNew = computed(() => this.id() === 'nouvelle');
  private readonly byId = computed(() => new Map(this.points().map((p) => [p.id, p])));

  /** Points d'arrêt actifs groupés par ville, pour les listes de choix. */
  protected readonly pointGroups = computed(() => {
    const groups = new Map<string, StopPoint[]>();
    for (const p of this.points()) {
      if (p.is_active) {
        groups.set(p.city_name, [...(groups.get(p.city_name) ?? []), p]);
      }
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr')).map(([city, points]) => ({ city, points }));
  });

  protected readonly offsets = computed(() => offsetsFromTimes(this.stops().map((s) => s.time)));
  protected readonly totalMinutes = computed(() => this.offsets().at(-1) ?? 0);

  /** Avertissements immédiats (le serveur refait tous les contrôles). */
  protected readonly problems = computed(() => {
    const s = this.stops();
    const out: string[] = [];
    if (s.length < 2) out.push('Une ligne compte au moins 2 arrêts.');
    if (s.some((x) => !x.stop_point_id)) out.push('Choisissez un point d’arrêt pour chaque ligne du tableau.');
    const ids = s.map((x) => x.stop_point_id).filter(Boolean);
    if (new Set(ids).size !== ids.length) out.push('Un point d’arrêt figure deux fois.');
    if (s[0] && !this.isAgency(s[0].stop_point_id)) out.push('Le premier arrêt doit être une agence.');
    const off = this.offsets();
    for (let i = 1; i < s.length; i++) {
      if (off[i] <= off[i - 1] + s[i - 1].pause_minutes) {
        out.push(`Arrêt ${i + 1} : l’heure doit suivre l’arrêt précédent, pause comprise.`);
      }
    }
    return out;
  });

  /** Villes de montée (dans l'ordre) et villes desservies après chacune, pour la grille. */
  protected readonly grid = computed(() => {
    const s = this.stops();
    const byId = this.byId();
    const cities = s.map((x) => byId.get(x.stop_point_id));
    const boards: { id: string; name: string; index: number }[] = [];
    const alights: { id: string; name: string; index: number }[] = [];
    s.forEach((x, i) => {
      const p = cities[i];
      if (!p) return;
      if (x.can_board && !boards.some((b) => b.id === p.city_id)) boards.push({ id: p.city_id, name: p.city_name, index: i });
      if (x.can_alight) {
        const k = alights.findIndex((a) => a.id === p.city_id);
        if (k >= 0) alights.splice(k, 1);
        alights.push({ id: p.city_id, name: p.city_name, index: i });
      }
    });
    alights.sort((a, b) => a.index - b.index);
    return { boards, alights };
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const [points, routes] = await Promise.all([this.api.invoke(listStopPoints), this.isNew() ? Promise.resolve([]) : this.api.invoke(listRoutes)]);
      this.points.set(points);
      if (this.isNew()) {
        this.stops.set([this.row(true), this.row(false)]);
      } else {
        const r = routes.find((x) => x.id === this.id());
        if (!r) {
          this.error.set('Ligne introuvable.');
          return;
        }
        this.fill(r);
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private fill(r: Route): void {
    this.name.set(r.name);
    this.basePrice.set(r.base_price);
    this.mode.set(r.pricing_mode);
    this.baggage.set(r.included_baggage_kg);
    this.distance.set(r.distance_km ?? null);
    this.active.set(r.is_active);
    this.stops.set(r.stops.map((s) => ({ stop_point_id: s.stop_point_id, time: timeAt(this.departureTime(), s.offset_minutes),
      pause_minutes: s.pause_minutes, can_board: s.can_board, can_alight: s.can_alight })));
    const fares: Record<string, number | null> = {};
    for (const f of r.fares) fares[`${f.from_city_id}|${f.to_city_id}`] = f.price;
    this.fares.set(fares);
  }

  private row(first: boolean): StopRow {
    return { stop_point_id: '', time: this.departureTime(), pause_minutes: 0, can_board: first, can_alight: !first };
  }

  protected isAgency(id: string): boolean {
    return !!this.byId().get(id)?.agency_id;
  }

  protected update(i: number, patch: Partial<StopRow>): void {
    this.stops.update((rows) => rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  }

  /** Nouveau point d'arrêt : montée cochée par défaut s'il s'agit d'une agence (sauf au dernier arrêt). */
  protected choosePoint(i: number, id: string): void {
    const last = i === this.stops().length - 1;
    const agency = this.isAgency(id);
    this.update(i, { stop_point_id: id, can_board: agency && (i === 0 || !last), can_alight: i > 0 });
    this.suggestName();
  }

  protected add(): void {
    const rows = this.stops();
    const lastTime = rows.at(-1)?.time ?? this.departureTime();
    this.stops.set([...rows, { ...this.row(false), time: lastTime }]);
  }

  protected remove(i: number): void {
    this.stops.update((rows) => rows.filter((_, k) => k !== i));
  }

  protected move(i: number, delta: -1 | 1): void {
    const rows = [...this.stops()];
    const j = i + delta;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    this.stops.set(rows);
  }

  /** Change l'heure de référence : les heures de passage suivent. */
  protected setDepartureTime(t: string): void {
    const offs = this.offsets();
    this.departureTime.set(t);
    this.stops.update((rows) => rows.map((r, i) => ({ ...r, time: timeAt(t, offs[i] ?? 0) })));
  }

  private suggestName(): void {
    if (this.name()) return;
    const s = this.stops();
    const first = this.byId().get(s[0]?.stop_point_id ?? '');
    const last = this.byId().get(s.at(-1)?.stop_point_id ?? '');
    if (first && last && first.city_id !== last.city_id) this.name.set(`${first.city_name} → ${last.city_name}`);
  }

  protected fare(from: string, to: string): number | null {
    return this.fares()[`${from}|${to}`] ?? null;
  }

  protected setFare(from: string, to: string, value: string): void {
    const n = Number(value);
    this.fares.update((f) => ({ ...f, [`${from}|${to}`]: value === '' || !Number.isFinite(n) || n <= 0 ? null : Math.round(n) }));
  }

  protected async save(): Promise<void> {
    if (this.problems().length) {
      this.toast.error(this.problems()[0]);
      return;
    }
    const offs = this.offsets();
    const fares: RouteFare[] = [];
    if (this.mode() === 'grid') {
      const { boards, alights } = this.grid();
      for (const b of boards) {
        for (const a of alights) {
          const v = this.fare(b.id, a.id);
          if (a.index > b.index && a.id !== b.id && v != null && v !== this.basePrice()) {
            fares.push({ from_city_id: b.id, to_city_id: a.id, price: v });
          }
        }
      }
    }
    const body = {
      name: this.name().trim(),
      base_price: this.basePrice(),
      pricing_mode: this.mode(),
      included_baggage_kg: this.baggage(),
      distance_km: this.distance() ?? undefined,
      is_active: this.active(),
      stops: this.stops().map((s, i) => ({ stop_point_id: s.stop_point_id, offset_minutes: offs[i], pause_minutes: s.pause_minutes,
        can_board: s.can_board, can_alight: s.can_alight })),
      fares,
    };
    this.saving.set(true);
    try {
      if (this.isNew()) {
        await this.api.invoke(createRoute, { body });
      } else {
        await this.api.invoke(updateRoute, { id: this.id(), body });
      }
      this.toast.success(this.isNew() ? 'Ligne créée.' : 'Ligne enregistrée : elle s’applique aux départs programmés ensuite.');
      await this.router.navigateByUrl('/admin/lignes');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
