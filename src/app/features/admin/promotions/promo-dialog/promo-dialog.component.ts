import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../../api/api';
import { createPromoBatch, createPromoCode, updatePromoCode } from '../../../../api/functions';
import { PromoCode, PromoInput, Route, SeatCategory } from '../../../../api/models';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { toLocalInput, toRfc3339 } from '../../../../shared/dates';

export interface PromoDialogData {
  mode: 'create' | 'batch' | 'edit';
  promo?: PromoCode;
  routes: Route[];
  categories: SeatCategory[];
}

/** Résultat : code créé ou modifié, ou série générée (codes à distribuer). */
export type PromoDialogResult = { promo: PromoCode } | { batchId: string; codes: string[] };

const CHANNELS: [string, string][] = [
  ['web', 'Site web'],
  ['app', 'Application'],
  ['counter', 'Guichet'],
  ['ussd', 'USSD'],
];

/** Création ou modification d'un code promo, ou génération d'une série à usage unique. */
@Component({
  selector: 'bv-promo-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './promo-dialog.component.html',
  styleUrl: './promo-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoDialogComponent {
  private readonly api = inject(Api);
  protected readonly ref = inject<DialogRef<PromoDialogResult>>(DialogRef);
  protected readonly data = inject<PromoDialogData>(DIALOG_DATA);
  protected readonly channelOptions = CHANNELS;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly p = this.data.promo;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    code: [this.p?.code ?? '', this.data.mode === 'create' ? [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{3,30}$/)] : []],
    prefix: ['', this.data.mode === 'batch' ? [Validators.required, Validators.pattern(/^[A-Za-z0-9]{2,12}$/)] : []],
    count: [50, this.data.mode === 'batch' ? [Validators.required, Validators.min(1), Validators.max(500)] : []],
    label: [this.p?.label ?? ''],
    kind: [(this.p?.kind ?? 'percent') as 'percent' | 'fixed'],
    value: [this.p?.value ?? 10, [Validators.required, Validators.min(1)]],
    max_discount: [this.p?.max_discount ?? (null as number | null)],
    min_amount: [this.p?.min_amount ?? 0, Validators.min(0)],
    valid_from: [this.p?.valid_from ? toLocalInput(this.p.valid_from) : ''],
    valid_to: [this.p?.valid_to ? toLocalInput(this.p.valid_to) : ''],
    usage_limit: [this.p?.usage_limit ?? (null as number | null)],
    per_customer_limit: [this.p?.per_customer_limit ?? 1, [Validators.required, Validators.min(1)]],
    first_trip_only: [this.p?.first_trip_only ?? false],
    is_active: [this.p?.is_active ?? true],
  });
  protected readonly channels = signal(new Set(this.p?.channels ?? CHANNELS.map((c) => c[0])));
  protected readonly routeIds = signal(new Set(this.p?.route_ids ?? []));
  protected readonly categoryCodes = signal(new Set(this.p?.category_codes ?? []));

  protected toggle(set: 'channels' | 'routeIds' | 'categoryCodes', value: string, on: boolean): void {
    this[set].update((s) => {
      const next = new Set(s);
      if (on) {
        next.add(value);
      } else {
        next.delete(value);
      }
      return next;
    });
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.kind === 'percent' && v.value > 100) {
      this.error.set('Un pourcentage ne peut pas dépasser 100.');
      return;
    }
    if (this.channels().size === 0) {
      this.error.set('Choisissez au moins un canal.');
      return;
    }
    const body: PromoInput = {
      label: v.label.trim() || undefined,
      kind: v.kind,
      value: v.value,
      max_discount: v.kind === 'percent' && v.max_discount ? v.max_discount : undefined,
      min_amount: v.min_amount || undefined,
      valid_from: v.valid_from ? toRfc3339(v.valid_from) : undefined,
      valid_to: v.valid_to ? toRfc3339(v.valid_to) : undefined,
      usage_limit: v.usage_limit || undefined,
      per_customer_limit: v.per_customer_limit,
      first_trip_only: v.first_trip_only,
      channels: [...this.channels()],
      route_ids: [...this.routeIds()],
      category_codes: [...this.categoryCodes()],
      is_active: v.is_active,
    };
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.data.mode === 'batch') {
        const r = await this.api.invoke(createPromoBatch, { body: { ...body, prefix: v.prefix.toUpperCase(), count: v.count } });
        this.ref.close({ batchId: r.batch_id, codes: r.codes });
      } else if (this.data.mode === 'edit' && this.p) {
        this.ref.close({ promo: await this.api.invoke(updatePromoCode, { id: this.p.id, body }) });
      } else {
        this.ref.close({ promo: await this.api.invoke(createPromoCode, { body: { ...body, code: v.code.toUpperCase() } }) });
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
