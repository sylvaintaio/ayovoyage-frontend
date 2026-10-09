import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import { createDeparture, createRecurringDepartures, listBuses, listRoutes, listStaff, updateDeparture } from '../../../api/functions';
import { AdminDeparture, Bus, RecurringResult, Route, Staff } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { localDate, toLocalInput, toRfc3339 } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

/** Résultat de la fenêtre : départ créé/modifié, ou nombre de départs récurrents créés. */
export type DepartureFormResult = AdminDeparture | { recurring: number };

const WEEKDAYS = [
  { n: 1, short: 'L', label: 'lundi' },
  { n: 2, short: 'M', label: 'mardi' },
  { n: 3, short: 'M', label: 'mercredi' },
  { n: 4, short: 'J', label: 'jeudi' },
  { n: 5, short: 'V', label: 'vendredi' },
  { n: 6, short: 'S', label: 'samedi' },
  { n: 7, short: 'D', label: 'dimanche' },
];

/** Programmation (unique ou récurrente) ou modification d'un départ, en fenêtre modale. */
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
  protected readonly editing = inject<AdminDeparture | null>(DIALOG_DATA, { optional: true });

  protected readonly routes = signal<Route[]>([]);
  protected readonly buses = signal<Bus[]>([]);
  protected readonly drivers = signal<Staff[]>([]);
  protected readonly agents = signal<Staff[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  // Programmation récurrente
  protected readonly weekdays = WEEKDAYS;
  protected readonly repeat = signal(false);
  protected readonly days = signal<number[]>([1, 2, 3, 4, 5, 6, 7]);
  protected readonly preview = signal<RecurringResult | null>(null);
  protected readonly allDays = computed(() => this.days().length === 7);
  protected readonly recurring = inject(FormBuilder).nonNullable.group({
    time: ['07:00', Validators.required],
    from_date: [localDate(1), Validators.required],
    to_date: [localDate(30), Validators.required],
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
      this.form.controls.bus_id.disable();
    }
    try {
      const canListStaff = this.auth.hasRole('company_admin', 'agency_manager');
      const [routes, buses, staff] = await Promise.all([
        this.api.invoke(listRoutes),
        this.api.invoke(listBuses),
        canListStaff ? this.api.invoke(listStaff) : Promise.resolve([] as Staff[]),
      ]);
      this.routes.set(routes.filter((r) => r.is_active || r.id === d?.route_id));
      this.buses.set(buses.filter((b) => b.status === 'active' || b.id === d?.bus_id));
      this.drivers.set(staff.filter((s) => s.is_active && s.role === 'driver'));
      this.agents.set(staff.filter((s) => s.is_active && s.role === 'boarding_agent'));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    }
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
      this.recurring.patchValue({ time: at.value.slice(11, 16) || '07:00', from_date: at.value.slice(0, 10) || localDate(1) });
    } else {
      at.setValidators(Validators.required);
    }
    at.updateValueAndValidity();
  }

  /** Aperçu puis création des départs récurrents. */
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
    this.saving.set(true);
    this.error.set(null);
    try {
      const result = await this.api.invoke(createRecurringDepartures, {
        body: {
          route_id: v.route_id,
          bus_id: v.bus_id,
          time: r.time,
          from_date: r.from_date,
          to_date: r.to_date,
          weekdays: this.allDays() ? undefined : this.days(),
          base_price: v.base_price || undefined,
          driver_id: v.driver_id || undefined,
          agent_id: v.agent_id || undefined,
          notes: v.notes,
          dry_run: dryRun,
        },
      });
      if (dryRun) {
        this.preview.set(result);
      } else {
        this.ref.close({ recurring: result.created.length });
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
        notes: v.notes,
      };
      const result = this.editing
        ? await this.api.invoke(updateDeparture, { id: this.editing.id, body: { ...common, base_price: v.base_price } })
        : await this.api.invoke(createDeparture, {
            body: { ...common, route_id: v.route_id, bus_id: v.bus_id, base_price: v.base_price || undefined },
          });
      this.ref.close(result);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
