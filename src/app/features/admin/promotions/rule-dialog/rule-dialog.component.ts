import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../../api/api';
import { createPricingRule, updatePricingRule } from '../../../../api/functions';
import { PricingRule, Route } from '../../../../api/models';
import { apiErrorMessage } from '../../../../core/http/api-error';

export interface RuleDialogData {
  rule?: PricingRule;
  routes: Route[];
}

/** Tarif « réservez tôt » : remise à N jours ou plus du départ, avec un quota de places par départ. */
@Component({
  selector: 'bv-rule-dialog',
  imports: [ReactiveFormsModule, FormsModule, DatePipe],
  templateUrl: './rule-dialog.component.html',
  styleUrl: './rule-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleDialogComponent {
  private readonly api = inject(Api);
  protected readonly ref = inject<DialogRef<PricingRule>>(DialogRef);
  protected readonly data = inject<RuleDialogData>(DIALOG_DATA);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly r = this.data.rule;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    label: [this.r?.label ?? 'Réservez tôt', [Validators.required, Validators.maxLength(80)]],
    route_id: [this.r?.route_id ?? ''],
    min_days_before: [this.r?.min_days_before ?? 7, [Validators.required, Validators.min(1), Validators.max(365)]],
    percent: [this.r?.percent ?? 10, [Validators.required, Validators.min(1), Validators.max(90)]],
    seat_quota: [this.r?.seat_quota ?? 10, [Validators.required, Validators.min(1), Validators.max(100)]],
    valid_from: [this.r?.valid_from ?? ''],
    valid_to: [this.r?.valid_to ?? ''],
    is_active: [this.r?.is_active ?? true],
  });
  protected readonly excluded = signal<string[]>(this.r?.excluded_dates ?? []);
  protected readonly newDate = signal('');

  protected addDate(): void {
    const d = this.newDate();
    if (d && !this.excluded().includes(d)) {
      this.excluded.update((list) => [...list, d].sort());
    }
    this.newDate.set('');
  }

  protected removeDate(d: string): void {
    this.excluded.update((list) => list.filter((x) => x !== d));
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      label: v.label.trim(),
      route_id: v.route_id || undefined,
      min_days_before: v.min_days_before,
      percent: v.percent,
      seat_quota: v.seat_quota,
      valid_from: v.valid_from || undefined,
      valid_to: v.valid_to || undefined,
      excluded_dates: this.excluded(),
      is_active: v.is_active,
    };
    this.saving.set(true);
    this.error.set(null);
    try {
      const rule = this.r
        ? await this.api.invoke(updatePricingRule, { id: this.r.id, body })
        : await this.api.invoke(createPricingRule, { body });
      this.ref.close(rule);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
