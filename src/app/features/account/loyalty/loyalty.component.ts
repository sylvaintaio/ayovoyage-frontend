import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { Api } from '../../../api/api';
import { getMyLoyaltyAccount, listMyLoyalty } from '../../../api/functions';
import { Account, AccountDetail } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';

const ENTRY_LABELS: Record<string, string> = {
  earn: 'Voyage',
  redeem: 'Utilisation',
  restore: 'Points rendus',
  revoke: 'Retrait',
  expire: 'Expiration',
  bonus: 'Bonus',
  adjust: 'Ajustement',
};

/** Programme de fidélité : points, niveau, progression, avantages, historique. */
@Component({
  selector: 'bv-loyalty',
  imports: [StateComponent, DatePipe, MoneyPipe],
  templateUrl: './loyalty.component.html',
  styleUrl: './loyalty.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoyaltyComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly accounts = signal<Account[]>([]);
  protected readonly detail = signal<AccountDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly entryLabels = ENTRY_LABELS;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.accounts.set(await this.api.invoke(listMyLoyalty));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected progress(a: Account): number {
    const target = a.next_tier?.min_trips;
    return target ? Math.min(100, Math.round((a.trips_12m / target) * 100)) : 100;
  }

  protected async showDetail(companyId: string): Promise<void> {
    try {
      this.detail.set(await this.api.invoke(getMyLoyaltyAccount, { company_id: companyId }));
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
