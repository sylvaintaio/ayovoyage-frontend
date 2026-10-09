import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { Api } from '../../../api/api';
import { listMyInvoices } from '../../../api/functions';
import { Invoice } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { InvoiceListComponent } from '../../../shared/ui/invoice-list/invoice-list.component';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Factures et avoirs du client (billets, bagages, colis), téléchargeables en PDF. */
@Component({
  selector: 'bv-my-invoices',
  imports: [StateComponent, InvoiceListComponent],
  templateUrl: './invoices.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInvoicesComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.invoices.set(await this.api.invoke(listMyInvoices, {}));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
