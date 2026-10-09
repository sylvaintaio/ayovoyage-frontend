import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { createBus, listAgencies, listBuses, listSeatLayouts, updateBus } from '../../../api/functions';
import { Agency, Bus, SeatLayout } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

type BusStatus = 'active' | 'maintenance' | 'out_of_service';

/** Parc de bus : immatriculation, plan de sièges, équipements, disponibilité. */
@Component({
  selector: 'bv-buses',
  imports: [StateComponent, StatusBadgeComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './buses.component.html',
  styleUrl: './buses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusesComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly buses = signal<Bus[]>([]);
  protected readonly layouts = signal<SeatLayout[]>([]);
  protected readonly agencies = signal<Agency[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<Bus | 'new' | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    plate_number: ['', [Validators.required, Validators.minLength(4)]],
    internal_code: [''],
    model: [''],
    layout_id: ['', Validators.required],
    amenities: [''],
    status: ['active' as BusStatus],
    home_agency_id: [''],
    notes: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [buses, layouts, agencies] = await Promise.all([
        this.api.invoke(listBuses),
        this.api.invoke(listSeatLayouts),
        this.api.invoke(listAgencies),
      ]);
      this.buses.set(buses);
      this.layouts.set(layouts);
      this.agencies.set(agencies);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected edit(b: Bus | 'new'): void {
    this.editing.set(b);
    this.form.reset(
      b === 'new'
        ? {}
        : { ...b, amenities: b.amenities.join(', '), home_agency_id: b.home_agency_id ?? '', status: b.status as BusStatus },
    );
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      ...v,
      amenities: v.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      home_agency_id: v.home_agency_id || undefined,
    };
    const current = this.editing();
    this.saving.set(true);
    try {
      if (current === 'new') {
        await this.api.invoke(createBus, { body });
      } else if (current) {
        await this.api.invoke(updateBus, { id: current.id, body });
      }
      this.toast.success('Bus enregistré.');
      this.editing.set(null);
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
