import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../api/api';
import { getDepartureOnboard, handOverOnboardCash, listAgencies, resolveOnboardIssue, setOnboardQuota } from '../../../api/functions';
import { Agency, DepartureStop, OnboardSummary } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

/**
 * Vente à bord d'un départ : places réservées au contrôleur, ventes (en ligne et sans réseau),
 * caisse du contrôleur et remise à une agence, anomalies à régulariser.
 */
@Component({
  selector: 'bv-departure-onboard',
  imports: [FormsModule, DatePipe, MoneyPipe],
  templateUrl: './departure-onboard.component.html',
  styleUrl: './departure-onboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartureOnboardComponent {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);

  readonly departureId = input.required<string>();
  readonly departureStatus = input<string>('scheduled');
  readonly stops = input<DepartureStop[]>([]);
  /** Agences proposées pour recevoir la caisse (personnel du siège). */
  protected readonly agencies = signal<Agency[]>([]);

  protected readonly data = signal<OnboardSummary | null>(null);
  protected readonly busy = signal(false);
  protected readonly quota = signal(0);
  protected readonly counted = signal<number | null>(null);
  protected readonly note = signal('');
  protected readonly agencyId = signal('');
  protected readonly resolution = signal<Record<string, string>>({});

  protected readonly canPlan = this.auth.hasRole('company_admin') || this.auth.hasRole('agency_manager');
  protected readonly canReceive = this.canPlan || this.auth.hasRole('cashier');
  /** Personnel du siège : choisit l'agence qui reçoit la caisse. */
  protected readonly needsAgency = !this.auth.me()?.staff?.agency_id;
  protected readonly open = computed(() => !['arrived', 'cancelled'].includes(this.departureStatus()));
  protected readonly gap = computed(() => {
    const d = this.data();
    const c = this.counted();
    return d && c !== null ? c - d.cash : 0;
  });

  constructor() {
    effect(() => void this.load(this.departureId()));
    if (this.needsAgency) {
      this.api.invoke(listAgencies).then(
        (list) => this.agencies.set(list.filter((a) => a.is_active)),
        () => undefined,
      );
    }
    effect(() => {
      const list = this.agencies();
      if (!this.agencyId() && list.length) {
        // Par défaut : l'agence du terminus (là où le contrôleur rend la caisse).
        const last = this.stops().at(-1)?.agency_id;
        this.agencyId.set(list.find((a) => a.id === last)?.id ?? list[0].id);
      }
    });
  }

  protected readonly seatLabel = (s: { seat_label: string }) => s.seat_label;

  protected stopName(seq: number): string {
    return this.stops().find((s) => s.seq === seq)?.city_name ?? '';
  }

  protected async load(id: string): Promise<void> {
    try {
      const d = await this.api.invoke(getDepartureOnboard, { id });
      this.data.set(d);
      this.quota.set(d.quota_seats.length);
    } catch {
      this.data.set(null);
    }
  }

  protected async saveQuota(): Promise<void> {
    await this.run(async () => {
      const d = await this.api.invoke(setOnboardQuota, { id: this.departureId(), body: { seats: this.quota() } });
      this.data.set(d);
      const got = d.quota_seats.length;
      this.toast.success(got < this.quota() ? `${got} place(s) seulement : le car est presque plein.` : 'Places réservées mises à jour.');
      this.quota.set(got);
    });
  }

  protected async handOver(): Promise<void> {
    const counted = this.counted();
    if (counted === null || counted < 0) {
      this.toast.error('Saisissez le montant compté.');
      return;
    }
    if (this.gap() !== 0 && this.note().trim().length < 5) {
      this.toast.error('Écart de caisse : expliquez-le dans la remarque.');
      return;
    }
    await this.run(async () => {
      this.data.set(
        await this.api.invoke(handOverOnboardCash, {
          id: this.departureId(),
          body: {
            counted_cash: counted,
            note: this.note().trim() || undefined,
            agency_id: this.needsAgency ? this.agencyId() || undefined : undefined,
          },
        }),
      );
      this.toast.success('Caisse du contrôleur reçue.');
    });
  }

  protected setResolution(id: string, text: string): void {
    this.resolution.update((r) => ({ ...r, [id]: text }));
  }

  protected async resolve(issueId: string): Promise<void> {
    const text = (this.resolution()[issueId] ?? '').trim();
    if (text.length < 3) {
      this.toast.error('Indiquez ce qui a été fait.');
      return;
    }
    await this.run(async () => {
      this.data.set(
        await this.api.invoke(resolveOnboardIssue, { id: this.departureId(), issue_id: issueId, body: { resolution: text } }),
      );
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
