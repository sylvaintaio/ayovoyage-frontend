import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import { adjustLoyaltyPoints, getLoyaltyProgram, getLoyaltyStats, updateLoyaltyProgram } from '../../../api/functions';
import { GetLoyaltyStatsResponse, Tier } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

/** Configuration du programme de fidélité : barème, niveaux, avantages, ajustements. */
@Component({
  selector: 'bv-admin-loyalty',
  imports: [ReactiveFormsModule, FormsModule, MoneyPipe],
  templateUrl: './loyalty.component.html',
  styleUrl: './loyalty.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoyaltyComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly auth = inject(AuthStore);

  protected readonly stats = signal<GetLoyaltyStatsResponse | null>(null);
  protected readonly saving = signal(false);
  protected readonly isAdmin = this.auth.hasRole('company_admin');

  protected readonly form = this.fb.group({
    program: this.fb.group({
      is_enabled: [true],
      points_per_100: [1, [Validators.min(0), Validators.max(100)]],
      point_value: [5, [Validators.min(0), Validators.max(1000)]],
      max_redeem_percent: [50, [Validators.min(0), Validators.max(100)]],
      points_validity_months: [12, [Validators.min(1), Validators.max(60)]],
      signup_bonus_points: [0, Validators.min(0)],
      referee_reward_amount: [1000, [Validators.min(0), Validators.max(100000)]],
      referrer_reward_points: [200, [Validators.min(0), Validators.max(100000)]],
      referrer_monthly_cap: [10, [Validators.min(0), Validators.max(100)]],
    }),
    tiers: this.fb.array<FormGroup>([]),
  });

  protected readonly adjust = this.fb.group({
    customer_phone: ['', [Validators.required, Validators.minLength(8)]],
    points: [0, Validators.required],
    reason: ['', [Validators.required, Validators.minLength(5)]],
  });

  protected get tiers(): FormArray<FormGroup> {
    return this.form.controls.tiers;
  }

  async ngOnInit(): Promise<void> {
    try {
      const [config, stats] = await Promise.all([this.api.invoke(getLoyaltyProgram), this.api.invoke(getLoyaltyStats)]);
      this.form.controls.program.patchValue(config.program);
      config.tiers.forEach((t) => this.addTier(t));
      this.stats.set(stats);
      if (!this.isAdmin) {
        this.form.disable();
      }
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  protected addTier(t?: Tier): void {
    this.tiers.push(
      this.fb.group({
        code: [t?.code ?? '', [Validators.required, Validators.pattern(/^[a-z0-9_]{2,30}$/)]],
        name: [t?.name ?? '', Validators.required],
        min_trips: [t?.min_trips ?? 0, [Validators.required, Validators.min(0)]],
        discount_percent: [t?.discount_percent ?? 0, [Validators.min(0), Validators.max(50)]],
        perks: [t?.perks.join('\n') ?? ''],
        // Avantages appliqués automatiquement ; vide = règle générale de la compagnie.
        cancellation_fee_percent: [t?.cancellation_fee_percent ?? null, [Validators.min(0), Validators.max(100)]],
        cancellation_cutoff_hours: [t?.cancellation_cutoff_hours ?? null, [Validators.min(0), Validators.max(168)]],
        free_change: [t?.free_change ?? false],
      }),
    );
  }

  protected removeTier(i: number): void {
    this.tiers.removeAt(i);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Vérifiez le barème et les niveaux.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    try {
      await this.api.invoke(updateLoyaltyProgram, {
        body: {
          program: v.program,
          tiers: v.tiers.map((t) => ({
            code: t['code'] as string,
            name: t['name'] as string,
            min_trips: +t['min_trips'],
            discount_percent: +t['discount_percent'],
            perks: (t['perks'] as string).split('\n').map((p) => p.trim()).filter(Boolean),
            cancellation_fee_percent: optionalNumber(t['cancellation_fee_percent']),
            cancellation_cutoff_hours: optionalNumber(t['cancellation_cutoff_hours']),
            free_change: !!t['free_change'],
          })),
        },
      });
      this.toast.success('Programme de fidélité enregistré.');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  protected async submitAdjustment(): Promise<void> {
    if (this.adjust.invalid || this.adjust.getRawValue().points === 0) {
      this.adjust.markAllAsTouched();
      return;
    }
    try {
      const account = await this.api.invoke(adjustLoyaltyPoints, { body: this.adjust.getRawValue() });
      this.toast.success(`Nouveau solde : ${account.points_balance} points.`);
      this.adjust.reset();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}

/** Champ numérique facultatif : vide → non renseigné. */
function optionalNumber(v: unknown): number | undefined {
  return v === null || v === undefined || v === '' ? undefined : +v;
}
