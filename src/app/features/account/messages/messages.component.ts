import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Api } from '../../../api/api';
import { listMyMessages } from '../../../api/functions';
import { Message } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { StateComponent } from '../../../shared/ui/state/state.component';

const LABELS: Record<string, string> = {
  welcome: 'Bienvenue',
  booking_confirmed: 'Réservation confirmée',
  booking_cancelled: 'Réservation annulée',
  booking_changed: 'Voyage modifié',
  trip_reminder: 'Rappel de voyage',
  trip_reminder_day: 'Rappel du jour',
  departure_boarding: 'Embarquement ouvert',
  departure_departed: 'Bus parti',
  departure_arrived: 'Bus arrivé',
  departure_cancelled: 'Départ annulé',
  departure_rescheduled: 'Changement d’horaire',
  pay_later_reserved: 'Réservation à payer en agence',
  pay_later_reminder: 'Rappel de paiement',
  pay_later_expired: 'Réservation non payée',
  review_invitation: 'Votre avis',
  invoice: 'Facture',
  credit_note: 'Avoir',
};

/** Journal des e-mails et SMS reçus par le client. */
@Component({
  selector: 'bv-messages',
  imports: [StateComponent, IconComponent, DatePipe],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly messages = signal<Message[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.messages.set(await this.api.invoke(listMyMessages, {}));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected label(m: Message): string {
    return LABELS[m.template] ?? 'Message';
  }

  /** Titre affiché : sujet de l'e-mail, sinon le type de message (SMS). */
  protected title(m: Message): string {
    return m.subject || this.label(m);
  }
}
