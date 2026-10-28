import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { Api } from '../../../api/api';
import { listMyInvoices } from '../../../api/functions';
import { Invoice } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { Pager } from '../../../shared/pager';
import { LoadMoreComponent } from '../../../shared/ui/load-more/load-more.component';
import { InvoiceListComponent } from '../../../shared/ui/invoice-list/invoice-list.component';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Factures et avoirs du client (billets, bagages, colis), téléchargeables en PDF. */
@Component({
  selector: 'bv-my-invoices',
  imports: [StateComponent, LoadMoreComponent, InvoiceListComponent],
  templateUrl: './invoices.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInvoicesComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly pager = new Pager(this.invoices, (page) =>
    this.api.invoke(listMyInvoices, page),
  );
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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
}
