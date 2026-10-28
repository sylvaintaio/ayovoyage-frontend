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
import { listDevices, listStaff, registerDevice, setDeviceActive } from '../../../api/functions';
import { Device, Staff } from '../../../api/models';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Terminaux de l'application Agent : enregistrement et désactivation (perte, vol). */
@Component({
  selector: 'bv-devices',
  imports: [StateComponent, ReactiveFormsModule, DatePipe],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevicesComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);

  protected readonly devices = signal<Device[]>([]);
  protected readonly staff = signal<Staff[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly created = signal<Device | null>(null);

  protected readonly fieldStaff = computed(() =>
    this.staff().filter(
      (s) =>
        s.is_active &&
        ['boarding_agent', 'driver', 'agency_manager', 'parcel_agent'].includes(s.role),
    ),
  );

  protected readonly form = inject(FormBuilder).nonNullable.group({
    staff_id: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    platform: ['android' as 'android' | 'ios'],
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [devices, staff] = await Promise.all([
        this.api.invoke(listDevices),
        this.api.invoke(listStaff),
      ]);
      this.devices.set(devices);
      this.staff.set(staff);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected staffName(id: string): string {
    return this.staff().find((s) => s.id === id)?.full_name ?? '—';
  }

  protected async register(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    try {
      const d = await this.api.invoke(registerDevice, { body: this.form.getRawValue() });
      this.created.set(d);
      this.form.reset();
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  protected async toggle(d: Device): Promise<void> {
    if (d.is_active) {
      const ok = await this.dialog.confirm({
        title: 'Désactiver ce terminal ?',
        message: `${d.name} ne pourra plus scanner ni synchroniser. À utiliser en cas de perte ou de vol.`,
        confirmLabel: 'Désactiver',
        danger: true,
      });
      if (!ok) {
        return;
      }
    }
    try {
      await this.api.invoke(setDeviceActive, { id: d.id, body: { is_active: !d.is_active } });
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
