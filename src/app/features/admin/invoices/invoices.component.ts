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
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listInvoices } from '../../../api/functions';
import { Invoice, ListInvoicesResponse } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { localDate } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  invoiceEmailLabel,
  invoicePdfUrl,
  openInvoiceEmail,
} from '../../../shared/ui/invoice-list/invoice-list.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { API_URL } from '../../../core/http/api-url';

const PAGE = 50;

type Kind = '' | 'invoice' | 'credit_note';

/** Factures et avoirs émis : période, recherche, totaux, PDF et export comptable. */
@Component({
  selector: 'bv-invoices',
  imports: [StateComponent, FormsModule, DatePipe, MoneyPipe, RouterLink],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthStore);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly canExport = this.auth.hasRole('company_admin', 'finance');
  protected readonly today = localDate(0);

  protected readonly from = signal(localDate(0).slice(0, 8) + '01');
  protected readonly to = signal(localDate(0));
  protected readonly kind = signal<Kind>('');
  protected readonly search = signal('');

  protected readonly data = signal<ListInvoicesResponse | null>(null);
  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly hasMore = signal(false);

  protected readonly net = computed(() => {
    const d = this.data();
    return d ? d.invoiced - d.credited : 0;
  });
  protected readonly exportUrl = computed(
    () => `${API_URL}/v1/admin/invoices/export?from=${this.from()}&to=${this.to()}`,
  );

  protected readonly emailLabel = invoiceEmailLabel;

  protected readonly kinds: [Kind, string][] = [
    ['', 'Tout'],
    ['invoice', 'Factures'],
    ['credit_note', 'Avoirs'],
  ];

  async ngOnInit(): Promise<void> {
    await this.load(true);
  }

  protected async load(reset = false): Promise<void> {
    if (this.from() > this.to()) {
      this.error.set('La date de début doit précéder la date de fin.');
      this.loading.set(false);
      return;
    }
    this.loading.set(reset);
    this.error.set(null);
    try {
      const page = await this.api.invoke(listInvoices, {
        from: this.from(),
        to: this.to(),
        kind: this.kind(),
        q: this.search().trim() || undefined,
        limit: PAGE,
        offset: reset ? 0 : this.invoices().length,
      });
      this.data.set(page);
      this.invoices.set(reset ? page.invoices : [...this.invoices(), ...page.invoices]);
      this.hasMore.set(page.invoices.length === PAGE);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected pdf(inv: Invoice, format: 'a4' | 'ticket' = 'a4'): string {
    return invoicePdfUrl(inv.id, 'admin', format);
  }

  protected async email(inv: Invoice): Promise<void> {
    const updated = await openInvoiceEmail(this.dialog, this.toast, inv);
    if (updated) {
      this.invoices.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
    }
  }

  protected link(inv: Invoice): string[] | null {
    if (inv.booking_id) {
      return ['/admin/reservations', inv.booking_id];
    }
    return inv.parcel_id ? ['/admin/colis', inv.parcel_id] : null;
  }
}
