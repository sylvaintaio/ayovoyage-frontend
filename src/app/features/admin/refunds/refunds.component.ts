import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { decideRefund, listRefunds, markRefundProcessed } from '../../../api/functions';
import { Refund } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { Pager } from '../../../shared/pager';
import { formatMoney, MoneyPipe } from '../../../shared/pipes/money.pipe';
import { LoadMoreComponent } from '../../../shared/ui/load-more/load-more.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { Payout, PayoutDialogComponent } from './payout-dialog/payout-dialog.component';

type Status = 'requested' | 'approved' | 'rejected' | 'processed' | '';

/** File des remboursements : décision (quatre yeux au-delà du seuil) puis versement. */
@Component({
  selector: 'bv-refunds',
  imports: [
    StateComponent,
    LoadMoreComponent,
    StatusBadgeComponent,
    FormsModule,
    RouterLink,
    DatePipe,
    MoneyPipe,
  ],
  templateUrl: './refunds.component.html',
  styleUrl: './refunds.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefundsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);

  protected readonly status = signal<Status>('requested');
  protected readonly refunds = signal<Refund[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly canPay = this.auth.hasRole('company_admin', 'finance');
  protected readonly pager = new Pager(this.refunds, (page) =>
    this.api.invoke(listRefunds, { status: this.status() || undefined, ...page }),
  );

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.pager.first();
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async more(): Promise<void> {
    try {
      await this.pager.next();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  protected async decide(r: Refund, approve: boolean): Promise<void> {
    const ok = await this.dialog.confirm({
      title: approve ? 'Approuver le remboursement ?' : 'Refuser le remboursement ?',
      message: `${r.booking_reference} — ${formatMoney(r.amount)} — ${r.reason}`,
      confirmLabel: approve ? 'Approuver' : 'Refuser',
      danger: !approve,
    });
    if (!ok) {
      return;
    }
    await this.run(
      () => this.api.invoke(decideRefund, { id: r.id, body: { approve } }),
      approve ? 'Remboursement approuvé.' : 'Remboursement refusé.',
    );
  }

  protected async markPaid(r: Refund): Promise<void> {
    const payout = await this.dialog.open<Payout>(PayoutDialogComponent, r);
    if (payout) {
      await this.run(
        () => this.api.invoke(markRefundProcessed, { id: r.id, body: payout }),
        payout.method === 'cash'
          ? 'Versement enregistré (déduit de la caisse de l’agence).'
          : 'Versement enregistré.',
      );
    }
  }

  private async run(fn: () => Promise<unknown>, success: string): Promise<void> {
    try {
      await fn();
      this.toast.success(success);
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
