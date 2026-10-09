import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { choosePayLater, createPayment, getMyBooking, getPayLaterOffer, listPaymentProviders } from '../../../api/functions';
import { BookingDetail, PayLaterAgency, PayLaterOffer, ProviderInfo } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CountdownComponent } from '../../../shared/ui/countdown/countdown.component';
import { BookingStepsComponent } from '../sections/booking-steps/booking-steps.component';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Paiement d'une réservation en attente (redirection vers l'agrégateur). */
@Component({
  selector: 'bv-payment',
  imports: [BookingStepsComponent, StateComponent, CountdownComponent, FormsModule, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentComponent {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly id = input.required<string>();

  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly providers = signal<ProviderInfo[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly paying = signal(false);
  protected readonly expired = signal(false);
  /** Payer en agence : proposé si la compagnie l'autorise et si la réservation s'y prête. */
  protected readonly offer = signal<PayLaterOffer | null>(null);
  protected readonly choosing = signal(false);

  protected readonly provider = signal('');
  protected readonly method = signal('mobile_money');
  protected readonly payerPhone = signal('');

  protected readonly methods = computed(
    () => this.providers().find((p) => p.code === this.provider())?.methods ?? ['mobile_money'],
  );

  constructor() {
    effect(() => void this.load(this.id()));
  }

  protected async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [booking, providers] = await Promise.all([
        this.api.invoke(getMyBooking, { id }),
        this.api.invoke(listPaymentProviders),
      ]);
      if (booking.status === 'confirmed') {
        await this.router.navigate(['/compte/reservations', booking.id]);
        return;
      }
      this.booking.set(booking);
      this.providers.set(providers);
      this.provider.set(providers[0]?.code ?? '');
      this.payerPhone.set(booking.contact_phone);
      this.expired.set(booking.status !== 'pending' || new Date(booking.expires_at) <= new Date());
      this.offer.set(null);
      if (!this.expired() && booking.payment_mode === 'online') {
        this.api.invoke(getPayLaterOffer, { id }).then(
          (o) => this.offer.set(o.enabled ? o : null),
          () => this.offer.set(null),
        );
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Réservation introuvable.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async pay(): Promise<void> {
    const b = this.booking();
    if (!b || !this.provider()) {
      return;
    }
    this.paying.set(true);
    try {
      const payment = await this.api.invoke(createPayment, {
        id: b.id,
        'Idempotency-Key': this.idempotencyKey(b.id),
        body: { provider: this.provider(), method: this.method() as 'mobile_money' | 'card', payer_phone: this.payerPhone() },
      });
      if (payment.provider === 'mock' || !payment.checkout_url) {
        await this.router.navigate(['/reservation', b.id, 'confirmation'], { queryParams: { paiement: payment.id } });
      } else {
        window.location.assign(payment.checkout_url);
      }
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
      sessionStorage.removeItem(`bv-pay-${b.id}`);
    } finally {
      this.paying.set(false);
    }
  }

  /** « Cotonou — Jonquet » ; la ville n'est ajoutée que si le nom ne la contient pas déjà. */
  protected agencyLabel(a: PayLaterAgency): string {
    return a.name.toLowerCase().includes(a.city.toLowerCase()) ? a.name : `${a.city} — ${a.name}`;
  }

  protected async payLater(): Promise<void> {
    const b = this.booking();
    if (!b) {
      return;
    }
    this.choosing.set(true);
    try {
      const updated = await this.api.invoke(choosePayLater, { id: b.id });
      this.toast.success(`Places réservées : à payer en agence avant le ${new Date(updated.pay_by ?? '').toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}.`);
      await this.router.navigate(['/compte/reservations', b.id]);
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.choosing.set(false);
    }
  }

  /** Même clé en cas de nouvelle tentative : jamais de double paiement. */
  private idempotencyKey(bookingId: string): string {
    const storageKey = `bv-pay-${bookingId}`;
    let key = sessionStorage.getItem(storageKey);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(storageKey, key);
    }
    return key;
  }
}
