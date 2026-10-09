import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { createAgency, createCity, listAgencies, listCities, updateAgency } from '../../../api/functions';
import { AgencyInput, City, OpeningHours } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { DAY_LABELS, SERVICE_LABELS } from '../../../shared/pipes/status';

type Day = OpeningHours['day'];
type Service = 'ticketing' | 'parcel_drop' | 'parcel_pickup' | 'lounge';
const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Création et modification d'une agence (informations affichées sur la page publique). */
@Component({
  selector: 'bv-agency-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './agency-form.component.html',
  styleUrl: './agency-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgencyFormComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly auth = inject(AuthStore);

  /** Absent : création. */
  readonly id = input<string>();

  protected readonly cities = signal<City[]>([]);
  protected readonly saving = signal(false);
  protected readonly newCity = signal('');
  protected readonly dayLabels = DAY_LABELS;
  protected readonly serviceList = Object.entries(SERVICE_LABELS) as [Service, string][];

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    city_id: ['', Validators.required],
    address: ['', Validators.required],
    landmark: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],
    phone: [''],
    whatsapp: [''],
    email: ['', Validators.email],
    services: this.fb.group({ ticketing: [true], parcel_drop: [false], parcel_pickup: [false], lounge: [false] }),
    hours: this.fb.array(
      DAYS.map((day) => this.fb.group({ day: [day], open_flag: [day !== 'sun'], open: ['06:00'], close: ['20:00'] })),
    ),
    instructions: [''],
    photos: [''],
    is_active: [true],
  });

  protected get hours(): FormArray<FormGroup> {
    return this.form.controls.hours as unknown as FormArray<FormGroup>;
  }

  async ngOnInit(): Promise<void> {
    try {
      this.cities.set(await this.api.invoke(listCities));
      const id = this.id();
      if (id) {
        const agency = (await this.api.invoke(listAgencies)).find((a) => a.id === id);
        if (!agency) {
          this.toast.error('Agence introuvable.');
          return;
        }
        const byDay = new Map(agency.opening_hours.map((h) => [h.day, h]));
        this.form.patchValue({
          name: agency.name,
          city_id: agency.city_id,
          address: agency.address,
          landmark: agency.landmark,
          latitude: agency.latitude ?? null,
          longitude: agency.longitude ?? null,
          phone: agency.phone,
          whatsapp: agency.whatsapp,
          email: agency.email,
          services: Object.fromEntries(this.serviceList.map(([s]) => [s, agency.services.includes(s)])),
          hours: DAYS.map((day) => {
            const h = byDay.get(day);
            return { day, open_flag: !!h, open: h?.open ?? '06:00', close: h?.close ?? '20:00' };
          }),
          instructions: agency.instructions,
          photos: agency.photos.join('\n'),
          is_active: agency.is_active,
        });
      }
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  protected async addCity(): Promise<void> {
    const name = this.newCity().trim();
    if (name.length < 2) {
      return;
    }
    try {
      const city = await this.api.invoke(createCity, { body: { name } });
      this.cities.update((list) => [...list, city].sort((a, b) => a.name.localeCompare(b.name)));
      this.form.controls.city_id.setValue(city.id);
      this.newCity.set('');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Vérifiez les champs obligatoires.');
      return;
    }
    const v = this.form.getRawValue();
    const services = this.serviceList.map(([s]) => s).filter((s) => v.services[s]);
    if (services.length === 0) {
      this.toast.error('Choisissez au moins un service.');
      return;
    }
    const body: AgencyInput = {
      name: v.name,
      city_id: v.city_id,
      address: v.address,
      landmark: v.landmark,
      latitude: v.latitude ?? undefined,
      longitude: v.longitude ?? undefined,
      phone: v.phone,
      whatsapp: v.whatsapp,
      email: v.email,
      services,
      opening_hours: v.hours.filter((h) => h.open_flag).map((h) => ({ day: h.day as Day, open: h.open, close: h.close })),
      instructions: v.instructions,
      photos: v.photos.split('\n').map((p) => p.trim()).filter(Boolean),
      is_active: v.is_active,
    };
    this.saving.set(true);
    try {
      const id = this.id();
      if (id) {
        await this.api.invoke(updateAgency, { id, body });
      } else {
        await this.api.invoke(createAgency, { body });
      }
      this.toast.success('Agence enregistrée.');
      await this.router.navigate(['/admin/agences']);
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
