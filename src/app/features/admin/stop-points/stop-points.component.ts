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
  createStopPoint,
  listCities,
  listStopPoints,
  updateStopPoint,
} from '../../../api/functions';
import { City, StopPoint } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { StateComponent } from '../../../shared/ui/state/state.component';

/**
 * Points d'arrêt de la compagnie : les agences (créés automatiquement, montée possible)
 * et les lieux en bord de route (carrefour, station, gare routière) où l'on descend.
 */
@Component({
  selector: 'bv-stop-points',
  imports: [StateComponent, ReactiveFormsModule],
  templateUrl: './stop-points.component.html',
  styleUrl: './stop-points.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StopPointsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly points = signal<StopPoint[]>([]);
  protected readonly cities = signal<City[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<StopPoint | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly query = signal('');

  /** Points filtrés, groupés par ville. */
  protected readonly byCity = computed(() => {
    const q = this.query().trim().toLowerCase();
    const groups = new Map<string, StopPoint[]>();
    for (const p of this.points()) {
      if (q && !`${p.name} ${p.city_name} ${p.address}`.toLowerCase().includes(q)) {
        continue;
      }
      groups.set(p.city_name, [...(groups.get(p.city_name) ?? []), p]);
    }
    return [...groups.entries()].map(([city, points]) => ({ city, points }));
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    city_id: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    address: [''],
    latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
    is_active: [true],
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [points, cities] = await Promise.all([
        this.api.invoke(listStopPoints),
        this.api.invoke(listCities),
      ]);
      this.points.set(points);
      this.cities.set(cities);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected edit(p: StopPoint | 'new'): void {
    this.editing.set(p);
    if (p === 'new') {
      this.form.reset();
      this.form.controls.city_id.enable();
    } else {
      this.form.reset({ ...p, latitude: p.latitude ?? null, longitude: p.longitude ?? null });
      this.form.controls.city_id.disable(); // les billets vendus font référence à la ville
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      city_id: v.city_id,
      name: v.name.trim(),
      address: v.address.trim(),
      latitude: v.latitude ?? undefined,
      longitude: v.longitude ?? undefined,
      is_active: v.is_active,
    };
    const current = this.editing();
    this.saving.set(true);
    try {
      if (current === 'new') {
        await this.api.invoke(createStopPoint, { body });
      } else if (current) {
        await this.api.invoke(updateStopPoint, { id: current.id, body });
      }
      this.toast.success("Point d'arrêt enregistré.");
      this.editing.set(null);
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
