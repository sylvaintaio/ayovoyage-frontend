import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import {
  cancelMyBooking,
  getMyBooking,
  getMyBookingPolicy,
  listMyBookingBaggage,
  listMyBookingInvoices,
} from '../../../api/functions';
import { Baggage, BookingDetail, BookingPolicy, Invoice } from '../../../api/models';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe, formatMoney } from '../../../shared/pipes/money.pipe';
import { CHANNEL_LABELS } from '../../../shared/pipes/status';
import { InvoiceListComponent } from '../../../shared/ui/invoice-list/invoice-list.component';
import { QrCodeComponent } from '../../../shared/ui/qr-code/qr-code.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';

@Component({
  selector: 'bv-booking-detail',
  imports: [
    ApiUrlPipe,
    StateComponent,
    StatusBadgeComponent,
    QrCodeComponent,
    InvoiceListComponent,
    RouterLink,
    DatePipe,
    MoneyPipe,
  ],
  templateUrl: './booking-detail.component.html',
  styleUrl: './booking-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetailComponent {
  private readonly api = inject(Api);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  readonly id = input.required<string>();

  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly policy = signal<BookingPolicy | null>(null);
  protected readonly bags = signal<Baggage[]>([]);
  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly channels = CHANNEL_LABELS;

  protected readonly payable = computed(() => {
    const b = this.booking();
    return b?.status === 'pending' && new Date(b.expires_at) > new Date();
  });
  protected readonly cancellable = computed(() => !!this.policy()?.cancel.allowed);
  protected readonly changeable = computed(() => !!this.policy()?.change.allowed);

  /** Avoir reporté d'une modification, tel qu'il s'impute sur le prix (jamais plus que le tarif). */
  protected readonly creditUsed = computed(() => {
    const b = this.booking();
    if (!b?.change_credit_amount) {
      return 0;
    }
    const fare = b.subtotal_amount - b.discount_amount - b.loyalty_points_amount;
    return Math.min(b.change_credit_amount, Math.max(0, fare));
  });

  /** Affiche les conditions seulement tant qu'elles concernent l'utilisateur. */
  protected readonly showConditions = computed(() => {
    const b = this.booking();
    return !!this.policy() && (b?.status === 'confirmed' || b?.status === 'pending');
  });

  constructor() {
    effect(() => void this.load(this.id()));
  }

  protected async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [booking, policy] = await Promise.all([
        this.api.invoke(getMyBooking, { id }),
        this.api.invoke(getMyBookingPolicy, { id }).catch(() => null),
      ]);
      this.booking.set(booking);
      this.policy.set(policy);
      this.api.invoke(listMyBookingBaggage, { id }).then(
        (b) => this.bags.set(b),
        () => this.bags.set([]),
      );
      this.api.invoke(listMyBookingInvoices, { id }).then(
        (list) => this.invoices.set(list),
        () => this.invoices.set([]),
      );
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Réservation introuvable.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async cancel(): Promise<void> {
    const b = this.booking();
    if (!b) {
      return;
    }
    const c = this.policy()?.cancel;
    let message = 'Les sièges bloqués seront libérés.';
    if (b.status === 'confirmed') {
      message = 'Les billets seront annulés et vos points utilisés vous seront rendus.';
      if (c && c.paid_amount > 0) {
        message +=
          c.fee_percent > 0
            ? ` Vous serez remboursé de ${formatMoney(c.refund_amount)} (frais d’annulation de ${c.fee_percent} % sur ${formatMoney(c.paid_amount)}).`
            : ` Vous serez remboursé intégralement : ${formatMoney(c.refund_amount)}.`;
        if (b.change_fee_amount) {
          message += ' Les frais de modification ne sont pas remboursés.';
        }
      }
    }
    const ok = await this.dialog.confirm({
      title: 'Annuler la réservation ?',
      message,
      confirmLabel: 'Annuler la réservation',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.busy.set(true);
    try {
      this.booking.set(await this.api.invoke(cancelMyBooking, { id: b.id, body: {} }));
      this.policy.set(await this.api.invoke(getMyBookingPolicy, { id: b.id }).catch(() => null));
      this.toast.success('Réservation annulée.');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
