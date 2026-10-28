import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import {
  createDeparture,
  createDepartureSchedule,
  listBuses,
  listRoutes,
  listStaff,
  updateDeparture,
  updateDepartureSchedule,
} from '../../../api/functions';
import {
  AdminDeparture,
  Bus,
  CrewMemberInput,
  Route,
  Schedule,
  ScheduleChange,
  Staff,
} from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { localDate, toLocalInput, toRfc3339 } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

/** Résultat de la fenêtre : départ créé/modifié, ou horaire régulier enregistré. */
export type DepartureFormResult = AdminDeparture | { schedule: ScheduleChange };

/**
 * Données de la fenêtre :
 * - null : nouveau départ, ponctuel ou régulier ;
 * - un départ : le modifier ;
 * - { schedule } : modifier un horaire régulier ;
 * - { repeat } : rendre ce départ régulier (ligne, bus, heure et équipage repris).
 */
export type DepartureFormData =
  AdminDeparture | { schedule: Schedule } | { repeat: AdminDeparture } | null;

/** Libellé court des jours d'un horaire : « Tous les jours », « Lun, mer, ven »… */
export function weekdaysLabel(days: number[]): string {
  if (!days.length || days.length === 7) return 'Tous les jours';
  if (days.join() === '1,2,3,4,5') return 'Du lundi au vendredi';
  if (days.join() === '6,7') return 'Le week-end';
  const names = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  const text = days.map((d) => names[d - 1]).join(', ');
  return text[0].toUpperCase() + text.slice(1);
}

const WEEKDAYS = [
  { n: 1, short: 'L', label: 'lundi' },
  { n: 2, short: 'M', label: 'mardi' },
  { n: 3, short: 'M', label: 'mercredi' },
  { n: 4, short: 'J', label: 'jeudi' },
  { n: 5, short: 'V', label: 'vendredi' },
  { n: 6, short: 'S', label: 'samedi' },
  { n: 7, short: 'D', label: 'dimanche' },
];

/** Programmation (ponctuelle ou régulière) ou modification d'un départ ou d'un horaire, en fenêtre modale. */
@Component({
  selector: 'bv-departure-form',
  imports: [ReactiveFormsModule, MoneyPipe, DatePipe],
  templateUrl: './departure-form.component.html',
  styleUrl: './departure-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartureFormComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthStore);
  protected readonly ref = inject<DialogRef<DepartureFormResult>>(DialogRef);
  private readonly data = inject<DepartureFormData>(DIALOG_DATA, { optional: true });
  /** Départ modifié (mode « un seul départ »). */
  protected readonly editing: AdminDeparture | null =
    this.data && 'id' in this.data ? this.data : null;
  /** Horaire régulier modifié. */
  protected readonly schedule: Schedule | null =
    this.data && 'schedule' in this.data ? this.data.schedule : null;
  /** Départ à rendre régulier. */
  protected readonly repeatFrom: AdminDeparture | null =
    this.data && 'repeat' in this.data ? this.data.repeat : null;
  /** Le choix « une seule fois / régulier » n'est proposé qu'à la création. */
  protected readonly canChooseFrequency = !this.data;

  protected readonly routes = signal<Route[]>([]);
  protected readonly buses = signal<Bus[]>([]);
  protected readonly drivers = signal<Staff[]>([]);
  protected readonly agents = signal<Staff[]>([]);
  /** Personnel de terrain pour les autres membres d'équipage (second chauffeur, aide). */
  protected readonly fieldStaff = computed(() => [...this.drivers(), ...this.agents()]);
  /** Autres membres d'équipage ; null = inchangés (modification sans y toucher). */
  protected readonly crew = signal<CrewMemberInput[] | null>(null);
  private readonly routeId = signal('');
  private readonly departureAt = signal('');
  /** Arrêts de la ligne choisie, avec l'heure de passage pour l'horaire saisi. */
  protected readonly routeStops = computed(() => {
    const route = this.routes().find((r) => r.id === this.routeId());
    const at = this.repeat()
      ? this.recurring.controls.time.value
      : this.departureAt().slice(11, 16);
    if (!route || !/^\d{2}:\d{2}$/.test(at)) return [];
    const [h, m] = at.split(':').map(Number);
    // API pas encore à jour (sans arrêts) : pas d'aperçu.
    return (route.stops ?? []).map((s) => {
      const t = (h * 60 + m + s.offset_minutes) % 1440;
      return {
        ...s,
        time: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`,
      };
    });
  });
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  // Programmation récurrente
  protected readonly weekdays = WEEKDAYS;
  protected readonly repeat = signal(!!(this.schedule || this.repeatFrom));
  protected readonly days = signal<number[]>([1, 2, 3, 4, 5, 6, 7]);
  protected readonly preview = signal<ScheduleChange | null>(null);
  protected readonly allDays = computed(() => this.days().length === 7);
  protected readonly daysLabel = computed(() => weekdaysLabel(this.days()));
  /** Date de fin facultative : vide = sans fin. */
  protected readonly recurring = inject(FormBuilder).nonNullable.group({
    time: ['07:00', Validators.required],
    from_date: [localDate(), Validators.required],
    to_date: [''],
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    route_id: ['', Validators.required],
    bus_id: ['', Validators.required],
    departure_at: [`${localDate(1)}T07:00`, Validators.required],
    base_price: [0, Validators.min(0)],
    driver_id: [''],
    agent_id: [''],
    notes: [''],
  });

  async ngOnInit(): Promise<void> {
    this.form.controls.route_id.valueChanges.subscribe((v) => this.routeId.set(v));
    this.form.controls.departure_at.valueChanges.subscribe((v) => this.departureAt.set(v));
    this.departureAt.set(this.form.controls.departure_at.value);
    const s = this.schedule;
    if (s) {
      this.form.patchValue({
        route_id: s.route_id,
        bus_id: s.bus_id,
        base_price: s.base_price,
        driver_id: s.driver_id ?? '',
        agent_id: s.agent_id ?? '',
        notes: s.notes,
      });
      this.recurring.patchValue({ time: s.time, from_date: s.starts_on, to_date: s.ends_on ?? '' });
      this.days.set(s.weekdays.length ? s.weekdays : [1, 2, 3, 4, 5, 6, 7]);
      this.crew.set(s.crew.map((c) => ({ ...c })));
      this.form.controls.route_id.disable();
      this.routeId.set(s.route_id);
      this.form.controls.departure_at.clearValidators();
    }
    const r = this.repeatFrom;
    if (r) {
      this.form.patchValue({
        route_id: r.route_id,
        bus_id: r.bus_id,
        base_price: r.base_price,
        driver_id: r.driver_id ?? '',
        agent_id: r.agent_id ?? '',
        notes: r.notes,
      });
      const local = toLocalInput(r.departure_at);
      this.recurring.patchValue({ time: local.slice(11, 16), from_date: local.slice(0, 10) });
      if (r.crew) {
        this.crew.set(
          r.crew
            .filter((c) => c.staff_id !== r.agent_id && c.staff_id !== r.driver_id)
            .map((c) => ({
              staff_id: c.staff_id,
              role: c.role === 'driver' ? 'driver' : 'assistant',
            })),
        );
      }
      this.form.controls.route_id.disable();
      this.routeId.set(r.route_id);
      this.form.controls.departure_at.clearValidators();
    }
    const d = this.editing;
    if (d) {
      this.form.patchValue({
        route_id: d.route_id,
        bus_id: d.bus_id,
        departure_at: toLocalInput(d.departure_at),
        base_price: d.base_price,
        driver_id: d.driver_id ?? '',
        agent_id: d.agent_id ?? '',
        notes: d.notes,
      });
      this.form.controls.route_id.disable();
      this.routeId.set(d.route_id);
      // Fiche du départ : autres membres connus (le contrôleur et le chauffeur sont dans le formulaire).
      if (d.crew) {
        this.crew.set(
          d.crew
            .filter((c) => c.staff_id !== d.agent_id && c.staff_id !== d.driver_id)
            .map((c) => ({
              staff_id: c.staff_id,
              role: c.role === 'driver' ? 'driver' : 'assistant',
            })),
        );
      }
    }
    try {
      const canListStaff = this.auth.hasRole('company_admin', 'agency_manager');
      const [routes, buses, staff] = await Promise.all([
        this.api.invoke(listRoutes),
        this.api.invoke(listBuses),
        canListStaff ? this.api.invoke(listStaff) : Promise.resolve([] as Staff[]),
      ]);
      const keepRoute = d?.route_id ?? s?.route_id ?? r?.route_id;
      const keepBus = d?.bus_id ?? s?.bus_id ?? r?.bus_id;
      this.routes.set(routes.filter((x) => x.is_active || x.id === keepRoute));
      this.buses.set(buses.filter((b) => b.status === 'active' || b.id === keepBus));
      this.drivers.set(staff.filter((s) => s.is_active && s.role === 'driver'));
      this.agents.set(staff.filter((s) => s.is_active && s.role === 'boarding_agent'));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    }
  }

  /** « jeu. 29 oct. à 06:41 · ven. 30 oct. · lun. 2 nov. … » (heure du Bénin). */
  protected upcomingText(dates: string[]): string {
    const tz = 'Africa/Porto-Novo';
    const day = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: tz,
    });
    const time = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    });
    const shown = dates
      .slice(0, 3)
      .map((d, i) =>
        i === 0
          ? `${day.format(new Date(d))} à ${time.format(new Date(d))}`
          : day.format(new Date(d)),
      );
    return shown.join(' · ') + (dates.length > 3 ? ' …' : '');
  }

  protected addCrew(): void {
    this.crew.update((c) => [...(c ?? []), { staff_id: '', role: 'assistant' }]);
  }

  protected updateCrew(i: number, patch: Partial<CrewMemberInput>): void {
    this.crew.update((c) => (c ?? []).map((m, k) => (k === i ? { ...m, ...patch } : m)));
  }

  protected removeCrew(i: number): void {
    this.crew.update((c) => (c ?? []).filter((_, k) => k !== i));
  }

  /** Autres membres complets, ou undefined pour ne pas y toucher. */
  private crewBody(): CrewMemberInput[] | undefined {
    const c = this.crew();
    return c === null ? undefined : c.filter((m) => m.staff_id);
  }

  protected toggleDay(n: number): void {
    this.preview.set(null);
    this.days.update((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort()));
  }

  protected setRepeat(on: boolean): void {
    this.repeat.set(on);
    this.preview.set(null);
    this.error.set(null);
    const at = this.form.controls.departure_at;
    if (on) {
      at.clearValidators();
      this.recurring.patchValue({
        time: at.value.slice(11, 16) || '07:00',
        from_date: at.value.slice(0, 10) || localDate(1),
      });
    } else {
      at.setValidators(Validators.required);
    }
    at.updateValueAndValidity();
  }

  /**
   * Horaire régulier : aperçu (rien n'est enregistré), puis enregistrement.
   * Création, transformation d'un départ ou modification d'un horaire existant.
   */
  protected async saveRecurring(dryRun: boolean): Promise<void> {
    if (this.form.invalid || this.recurring.invalid || this.days().length === 0) {
      this.form.markAllAsTouched();
      this.recurring.markAllAsTouched();
      if (this.days().length === 0) {
        this.error.set('Choisissez au moins un jour de la semaine.');
      }
      return;
    }
    const v = this.form.getRawValue();
    const r = this.recurring.getRawValue();
    const input = {
      bus_id: v.bus_id,
      time: r.time,
      weekdays: this.allDays() ? [] : this.days(),
      starts_on: r.from_date,
      ends_on: r.to_date || undefined,
      base_price: v.base_price || undefined,
      driver_id: v.driver_id || undefined,
      agent_id: v.agent_id || undefined,
      crew: this.crewBody() ?? [],
      notes: v.notes,
      active: this.schedule ? this.schedule.active : undefined,
      dry_run: dryRun,
    };
    this.saving.set(true);
    this.error.set(null);
    try {
      const result = this.schedule
        ? await this.api.invoke(updateDepartureSchedule, { id: this.schedule.id, body: input })
        : await this.api.invoke(createDepartureSchedule, {
            body: { ...input, route_id: v.route_id, from_departure_id: this.repeatFrom?.id },
          });
      if (dryRun) {
        this.preview.set(result);
      } else {
        this.ref.close({ schedule: result });
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (this.repeat()) {
      await this.saveRecurring(!this.preview());
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    try {
      const common = {
        departure_at: toRfc3339(v.departure_at),
        driver_id: v.driver_id || undefined,
        agent_id: v.agent_id || undefined,
        crew: this.crewBody(),
        notes: v.notes,
      };
      const result = this.editing
        ? await this.api.invoke(updateDeparture, {
            id: this.editing.id,
            body: {
              ...common,
              base_price: v.base_price,
              bus_id: v.bus_id !== this.editing.bus_id ? v.bus_id : undefined,
            },
          })
        : await this.api.invoke(createDeparture, {
            body: {
              ...common,
              route_id: v.route_id,
              bus_id: v.bus_id,
              base_price: v.base_price || undefined,
            },
          });
      this.ref.close(result);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
