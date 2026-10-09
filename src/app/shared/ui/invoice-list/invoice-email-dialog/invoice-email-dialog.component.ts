import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../../api/api';
import { emailInvoice } from '../../../../api/functions';
import { Invoice } from '../../../../api/models';
import { apiErrorMessage } from '../../../../core/http/api-error';

/** Back-office : envoi d'une facture par e-mail (adresse du client ou autre destinataire). Renvoie la facture à jour. */
@Component({
  selector: 'bv-invoice-email-dialog',
  imports: [FormsModule],
  templateUrl: './invoice-email-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceEmailDialogComponent {
  private readonly api = inject(Api);
  protected readonly ref = inject<DialogRef<Invoice>>(DialogRef);
  protected readonly invoice = inject<Invoice>(DIALOG_DATA);

  protected readonly to = signal(this.invoice.email_to || this.invoice.customer_email || '');
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async send(): Promise<void> {
    const to = this.to().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      this.error.set('Adresse e-mail invalide.');
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    try {
      this.ref.close(await this.api.invoke(emailInvoice, { id: this.invoice.id, body: { to } }));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.sending.set(false);
    }
  }
}
