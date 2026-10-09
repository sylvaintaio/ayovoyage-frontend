import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { Api } from '../../../api/api';
import { emailMyInvoice } from '../../../api/functions';
import { Invoice } from '../../../api/models';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../pipes/money.pipe';
import { InvoiceEmailDialogComponent } from './invoice-email-dialog/invoice-email-dialog.component';
import { API_URL } from '../../../core/http/api-url';

/** URL du PDF d'une facture : back-office (A4 ou ticket 80 mm) ou espace client. */
export function invoicePdfUrl(
  id: string,
  scope: 'admin' | 'client',
  format: 'a4' | 'ticket' = 'a4',
): string {
  return scope === 'admin'
    ? `${API_URL}/v1/admin/invoices/${id}/pdf${format === 'ticket' ? '?format=ticket' : ''}`
    : `${API_URL}/v1/me/invoices/${id}/pdf`;
}

/** Libellé de l'état d'envoi par e-mail (null : jamais envoyée). */
export function invoiceEmailLabel(inv: Invoice): string | null {
  switch (inv.email_status) {
    case 'sent':
      return `Envoyée par e-mail à ${inv.email_to}`;
    case 'simulated':
      return `Envoi simulé (mode test) à ${inv.email_to}`;
    case 'pending':
      return `Envoi par e-mail en cours à ${inv.email_to}`;
    case 'failed':
      return `Échec de l’envoi à ${inv.email_to}`;
    default:
      return null;
  }
}

/** Ouvre la fenêtre d'envoi (back-office) ; renvoie la facture à jour si l'envoi a réussi. */
export async function openInvoiceEmail(
  dialog: DialogService,
  toast: ToastService,
  inv: Invoice,
): Promise<Invoice | undefined> {
  const updated = await dialog.open<Invoice, Invoice>(InvoiceEmailDialogComponent, inv);
  if (updated) {
    toast.success(
      updated.email_status === 'simulated'
        ? 'Mode test : envoi simulé, aucun e-mail n’est parti.'
        : `${updated.number} envoyé à ${updated.email_to}.`,
    );
  }
  return updated;
}

/** Liste compacte des factures et avoirs d'une réservation, d'un colis ou d'un client. */
@Component({
  selector: 'bv-invoice-list',
  imports: [DatePipe, MoneyPipe],
  templateUrl: './invoice-list.component.html',
  styleUrl: './invoice-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceListComponent {
  private readonly api = inject(Api);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  readonly invoices = input.required<Invoice[]>();
  readonly scope = input<'admin' | 'client'>('client');

  /** Factures mises à jour après un envoi (sans recharger la page). */
  private readonly updated = signal<Record<string, Invoice>>({});
  protected readonly items = computed(() => this.invoices().map((i) => this.updated()[i.id] ?? i));
  protected readonly sending = signal<string | null>(null);
  protected readonly emailLabel = invoiceEmailLabel;

  protected pdf(inv: Invoice, format: 'a4' | 'ticket' = 'a4'): string {
    return invoicePdfUrl(inv.id, this.scope(), format);
  }

  protected async email(inv: Invoice): Promise<void> {
    if (this.scope() === 'admin') {
      const updated = await openInvoiceEmail(this.dialog, this.toast, inv);
      if (updated) {
        this.updated.update((m) => ({ ...m, [updated.id]: updated }));
      }
      return;
    }
    this.sending.set(inv.id);
    try {
      const updated = await this.api.invoke(emailMyInvoice, { id: inv.id });
      this.updated.update((m) => ({ ...m, [updated.id]: updated }));
      this.toast.success(
        updated.email_status === 'simulated'
          ? 'Mode test : envoi simulé, aucun e-mail n’est parti.'
          : `Envoyée à ${updated.email_to}. Pensez à regarder dans les courriers indésirables.`,
      );
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.sending.set(null);
    }
  }
}
