import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import { createMyPassenger, deleteMyPassenger, listMyPassengers } from '../../../api/functions';
import { Passenger } from '../../../api/models';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Proches et passagers fréquents, pour réserver plus vite. */
@Component({
  selector: 'bv-passengers',
  imports: [StateComponent, ReactiveFormsModule],
  templateUrl: './passengers.component.html',
  styleUrl: './passengers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengersComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);

  protected readonly passengers = signal<Passenger[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    relationship: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.passengers.set(await this.api.invoke(listMyPassengers));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async add(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const p = await this.api.invoke(createMyPassenger, { body: this.form.getRawValue() });
      this.passengers.update((list) =>
        [...list, p].sort((a, b) => a.full_name.localeCompare(b.full_name)),
      );
      this.form.reset();
      this.toast.success(`${p.full_name} ajouté(e).`);
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(p: Passenger): Promise<void> {
    if (
      !(await this.dialog.confirm({
        title: 'Supprimer ce proche ?',
        message: p.full_name,
        confirmLabel: 'Supprimer',
        danger: true,
      }))
    ) {
      return;
    }
    try {
      await this.api.invoke(deleteMyPassenger, { id: p.id });
      this.passengers.update((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
