import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../api/api';
import { closeCash, getCashSummary, listAgencies, listCashClosures } from '../../../api/functions';
import { Agency, CashClosure, CashSummary } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { localDate } from '../../../shared/dates';
import { MoneyPipe, formatMoney } from '../../../shared/pipes/money.pipe';
import { Pager } from '../../../shared/pager';
import { LoadMoreComponent } from '../../../shared/ui/load-more/load-more.component';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Caisse de l'agence : espèces du jour, clôture avec comptage, historique. */
@Component({
  selector: 'bv-cash',
  imports: [StateComponent, LoadMoreComponent, FormsModule, DatePipe, MoneyPipe],
  templateUrl: './cash.component.html',
  styleUrl: './cash.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  protected readonly auth = inject(AuthStore);

  /** Siège (administrateur, finance) : choix de l'agence. */
  protected readonly chooseAgency = this.auth.hasRole('company_admin', 'finance');
  protected readonly canClose = this.auth.hasRole('company_admin', 'agency_manager', 'cashier');
  protected readonly today = localDate(0);

  protected readonly agencies = signal<Agency[]>([]);
  protected readonly agencyId = signal('');
  protected readonly date = signal(localDate(0));
  protected readonly summary = signal<CashSummary | null>(null);
  protected readonly history = signal<CashClosure[]>([]);
  protected readonly pager = new Pager(
    this.history,
    (page) =>
      this.api.invoke(listCashClosures, { agency_id: this.agencyId() || undefined, ...page }),
    30,
  );
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly counted = signal<number | null>(null);
  protected readonly note = signal('');
  protected readonly saving = signal(false);
  protected readonly difference = computed(() => {
    const s = this.summary();
    const c = this.counted();
    return s && c !== null ? c - s.expected_cash : null;
  });

  async ngOnInit(): Promise<void> {
    if (this.chooseAgency) {
      try {
        const list = (await this.api.invoke(listAgencies)).filter((a) => a.is_active);
        this.agencies.set(list);
        this.agencyId.set(this.auth.me()?.staff?.agency_id ?? list[0]?.id ?? '');
      } catch (err) {
        this.error.set(apiErrorMessage(err));
      }
    }
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.counted.set(null);
    this.note.set('');
    const agency_id = this.agencyId() || undefined;
    try {
      const [summary] = await Promise.all([
        this.api.invoke(getCashSummary, { agency_id, date: this.date() }),
        this.pager.first(),
      ]);
      this.summary.set(summary);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async close(): Promise<void> {
    const s = this.summary();
    const counted = this.counted();
    if (!s || counted === null || counted < 0) {
      this.toast.error('Saisissez le montant compté dans la caisse.');
      return;
    }
    const diff = counted - s.expected_cash;
    if (diff !== 0 && this.note().trim().length < 5) {
      this.toast.error('Écart de caisse : expliquez-le dans le commentaire.');
      return;
    }
    const ok = await this.dialog.confirm({
      title: 'Clôturer la caisse ?',
      message:
        `Compté : ${formatMoney(counted)}. Attendu : ${formatMoney(s.expected_cash)}.` +
        (diff === 0
          ? ' Aucun écart.'
          : ` Écart : ${diff > 0 ? '+' : '−'}${formatMoney(Math.abs(diff))}.`) +
        ' La clôture est définitive.',
      confirmLabel: 'Clôturer',
    });
    if (!ok) {
      return;
    }
    this.saving.set(true);
    try {
      await this.api.invoke(closeCash, {
        body: {
          agency_id: this.agencyId() || undefined,
          date: this.date(),
          counted_cash: counted,
          note: this.note().trim() || undefined,
        },
      });
      this.toast.success('Caisse clôturée.');
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  protected agencyName(id: string): string {
    return this.agencies().find((a) => a.id === id)?.name ?? '';
  }

  protected async more(): Promise<void> {
    try {
      await this.pager.next();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
