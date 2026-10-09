import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import { createRoute, listAgencies, listRoutes, updateRoute } from '../../../api/functions';
import { Agency, Route } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { formatDuration } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Lignes (trajets) : agences de départ et d'arrivée, tarif Standard, durée. */
@Component({
  selector: 'bv-routes',
  imports: [StateComponent, ReactiveFormsModule, MoneyPipe],
  templateUrl: './routes.component.html',
  styleUrl: './routes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutesComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly routes = signal<Route[]>([]);
  protected readonly agencies = signal<Agency[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<Route | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly duration = formatDuration;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    origin_agency_id: ['', Validators.required],
    destination_agency_id: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    base_price: [5000, [Validators.required, Validators.min(1)]],
    duration_minutes: [240, [Validators.required, Validators.min(1)]],
    distance_km: [null as number | null],
    included_baggage_kg: [20, [Validators.required, Validators.min(0)]],
    is_active: [true],
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [routes, agencies] = await Promise.all([this.api.invoke(listRoutes), this.api.invoke(listAgencies)]);
      this.routes.set(routes);
      this.agencies.set(agencies);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected edit(r: Route | 'new'): void {
    this.editing.set(r);
    if (r === 'new') {
      this.form.reset();
      this.form.controls.origin_agency_id.enable();
      this.form.controls.destination_agency_id.enable();
    } else {
      this.form.reset({ ...r, distance_km: r.distance_km ?? null });
      this.form.controls.origin_agency_id.disable();
      this.form.controls.destination_agency_id.disable();
    }
  }

  /** Propose un nom « Ville A → Ville B » à partir des agences choisies. */
  protected suggestName(): void {
    const v = this.form.getRawValue();
    const from = this.agencies().find((a) => a.id === v.origin_agency_id);
    const to = this.agencies().find((a) => a.id === v.destination_agency_id);
    if (from && to && !v.name) {
      this.form.controls.name.setValue(`${from.city_name} → ${to.city_name}`);
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const current = this.editing();
    this.saving.set(true);
    try {
      const common = {
        name: v.name,
        base_price: v.base_price,
        duration_minutes: v.duration_minutes,
        distance_km: v.distance_km ?? undefined,
        included_baggage_kg: v.included_baggage_kg,
        is_active: v.is_active,
      };
      if (current === 'new') {
        await this.api.invoke(createRoute, {
          body: { ...common, origin_agency_id: v.origin_agency_id, destination_agency_id: v.destination_agency_id },
        });
      } else if (current) {
        await this.api.invoke(updateRoute, { id: current.id, body: common });
      }
      this.toast.success('Ligne enregistrée.');
      this.editing.set(null);
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
