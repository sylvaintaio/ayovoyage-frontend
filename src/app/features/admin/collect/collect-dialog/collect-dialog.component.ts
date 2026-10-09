import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../../api/api';
import { collectBooking, listAgencies } from '../../../../api/functions';
import { Agency, Booking, BookingDetail } from '../../../../api/models';
import { AuthStore } from '../../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

/** Encaissement d'une réservation en attente : espèces ou Mobile Money reçu sur le numéro de l'agence. */
@Component({
  selector: 'bv-collect-dialog',
  imports: [FormsModule, DatePipe, MoneyPipe],
  templateUrl: './collect-dialog.component.html',
  styleUrl: './collect-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectDialogComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthStore);
  protected readonly ref = inject<DialogRef<BookingDetail>>(DialogRef);
  protected readonly booking = inject<Booking>(DIALOG_DATA);

  protected readonly method = signal<'cash' | 'mobile_money'>('cash');
  protected readonly reference = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Personnel du siège : agence d'encaissement à choisir. */
  protected readonly needsAgency = !this.auth.me()?.staff?.agency_id;
  protected readonly agencies = signal<Agency[]>([]);
  protected readonly agencyId = signal('');

  async ngOnInit(): Promise<void> {
    if (this.needsAgency) {
      try {
        const list = (await this.api.invoke(listAgencies)).filter((a) => a.is_active);
        this.agencies.set(list);
        this.agencyId.set(list[0]?.id ?? '');
      } catch {
        // le serveur demandera l'agence
      }
    }
  }

  protected async confirm(): Promise<void> {
    if (this.method() === 'mobile_money' && this.reference().trim().length < 4) {
      this.error.set('Saisissez la référence de la transaction Mobile Money.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const detail = await this.api.invoke(collectBooking, {
        id: this.booking.id,
        body: {
          method: this.method(),
          reference: this.method() === 'mobile_money' ? this.reference().trim() : undefined,
          agency_id: this.needsAgency ? this.agencyId() || undefined : undefined,
        },
      });
      this.ref.close(detail);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
