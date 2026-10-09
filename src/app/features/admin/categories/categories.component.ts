import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import { createSeatCategory, listSeatCategories, updateSeatCategory } from '../../../api/functions';
import { SeatCategory } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Catégories de sièges (Standard, Premium, VIP…) : supplément et avantages vendus. */
@Component({
  selector: 'bv-categories',
  imports: [StateComponent, ReactiveFormsModule, MoneyPipe],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly categories = signal<SeatCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<SeatCategory | 'new' | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]{2,30}$/)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    surcharge_amount: [0, [Validators.required, Validators.min(0)]],
    color: ['#7d8681', Validators.pattern(/^#[0-9a-fA-F]{6}$/)],
    perks: [''],
    sort_order: [0],
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.categories.set(await this.api.invoke(listSeatCategories));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected edit(c: SeatCategory | 'new'): void {
    this.editing.set(c);
    this.form.reset(c === 'new' ? {} : { ...c, perks: c.perks.join('\n') });
    if (c === 'new') {
      this.form.controls.code.enable();
    } else {
      this.form.controls.code.disable();
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { ...v, perks: v.perks.split('\n').map((p) => p.trim()).filter(Boolean) };
    const current = this.editing();
    this.saving.set(true);
    try {
      if (current === 'new') {
        await this.api.invoke(createSeatCategory, { body });
      } else if (current) {
        await this.api.invoke(updateSeatCategory, { id: current.id, body });
      }
      this.toast.success('Catégorie enregistrée.');
      this.editing.set(null);
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
