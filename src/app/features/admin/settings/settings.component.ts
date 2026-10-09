import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import { getCompanySettings, listParcelTariffs, updateCompanySettings, updateParcelTariffs } from '../../../api/functions';
import { ParcelTariffDto } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';

/** Paramètres de la compagnie et règles commerciales (blocage, ventes, annulation, modification, remboursement). */
@Component({
  selector: 'bv-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly saving = signal(false);
  protected readonly tariffs = signal<ParcelTariffDto[]>([]);
  protected readonly savingTariffs = signal(false);

  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    legal_name: [''],
    phone: [''],
    email: ['', Validators.email],
    logo_url: [''],
    tax_id: [''],
    trade_register: [''],
    address: [''],
    invoice_prefix: ['FAC', [Validators.required, Validators.pattern(/^[A-Z0-9]{2,8}$/)]],
    invoice_footer: [''],
    booking_hold_minutes: [10, [Validators.required, Validators.min(2), Validators.max(60)]],
    sales_cutoff_minutes: [15, [Validators.required, Validators.min(0), Validators.max(720)]],
    cancellation_cutoff_hours: [6, [Validators.required, Validators.min(0), Validators.max(168)]],
    cancellation_fee_percent: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    refund_approval_threshold: [50000, [Validators.required, Validators.min(0)]],
    change_enabled: [true],
    change_cutoff_hours: [3, [Validators.required, Validators.min(0), Validators.max(168)]],
    change_fee_amount: [1000, [Validators.required, Validators.min(0), Validators.max(1000000)]],
    change_max_count: [1, [Validators.required, Validators.min(0), Validators.max(5)]],
    change_window_days: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
    baggage_extra_per_kg: [200, [Validators.required, Validators.min(0), Validators.max(100000)]],
    pay_later: this.fb.group({
      enabled: [false],
      hold_hours: [24, [Validators.required, Validators.min(1), Validators.max(168)]],
      cutoff_minutes: [120, [Validators.required, Validators.min(0), Validators.max(1440)]],
      max_seats: [4, [Validators.required, Validators.min(1), Validators.max(10)]],
      max_active: [2, [Validators.required, Validators.min(1), Validators.max(10)]],
      quota_percent: [30, [Validators.required, Validators.min(1), Validators.max(100)]],
      strikes: [3, [Validators.required, Validators.min(1), Validators.max(20)]],
    }),
  });

  async ngOnInit(): Promise<void> {
    try {
      this.api.invoke(listParcelTariffs).then(
        (t) => this.tariffs.set(t),
        () => undefined,
      );
      const s = await this.api.invoke(getCompanySettings);
      this.form.patchValue({
        ...s,
        legal_name: s.legal_name ?? '',
        phone: s.phone ?? '',
        email: s.email ?? '',
        logo_url: s.logo_url ?? '',
        tax_id: s.tax_id ?? '',
        trade_register: s.trade_register ?? '',
        address: s.address ?? '',
        invoice_footer: s.invoice_footer ?? '',
      });
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    try {
      await this.api.invoke(updateCompanySettings, {
        body: {
          ...v,
          legal_name: v.legal_name || undefined,
          phone: v.phone || undefined,
          email: v.email || undefined,
          logo_url: v.logo_url || undefined,
          tax_id: v.tax_id.trim() || undefined,
          trade_register: v.trade_register.trim() || undefined,
          address: v.address.trim() || undefined,
          invoice_prefix: v.invoice_prefix.trim().toUpperCase(),
          invoice_footer: v.invoice_footer.trim(),
        },
      });
      this.toast.success('Paramètres enregistrés.');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  protected setTariff(i: number, key: keyof ParcelTariffDto, value: string): void {
    this.tariffs.update((list) => list.map((t, j) => (j === i ? { ...t, [key]: key === 'label' ? value : Number(value) } : t)));
  }

  protected async saveTariffs(): Promise<void> {
    this.savingTariffs.set(true);
    try {
      this.tariffs.set(await this.api.invoke(updateParcelTariffs, { body: this.tariffs() }));
      this.toast.success('Tarifs colis enregistrés.');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.savingTariffs.set(false);
    }
  }
}
