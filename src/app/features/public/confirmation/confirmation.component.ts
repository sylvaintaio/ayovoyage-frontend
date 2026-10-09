import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Api } from '../../../api/api';
import { getMyBooking, getPayment } from '../../../api/functions';
import { BookingDetail, Payment } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { BookingStepsComponent } from '../sections/booking-steps/booking-steps.component';
import { QrCodeComponent } from '../../../shared/ui/qr-code/qr-code.component';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';
import { API_URL } from '../../../core/http/api-url';

const POLL_MS = 3000;
const POLL_MAX = 40; // 2 minutes

/** Attente de la confirmation du paiement, puis affichage des billets. */
@Component({
  selector: 'bv-confirmation',
  imports: [ApiUrlPipe, BookingStepsComponent, RouterLink, QrCodeComponent, MoneyPipe],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationComponent {
  private readonly api = inject(Api);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly id = input.required<string>();
  readonly paiement = input<string | undefined>();

  protected readonly payment = signal<Payment | null>(null);
  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly timedOut = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const id = this.paiement();
      if (id) {
        void this.poll(id, 0);
      } else {
        void this.loadBooking();
      }
    });
    inject(DestroyRef).onDestroy(() => this.timer && clearTimeout(this.timer));
  }

  /** Paiement simulé (fournisseur « mock », développement uniquement). */
  protected async simulate(outcome: 'succeeded' | 'failed'): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${API_URL}/v1/dev/payments/${this.paiement() ?? ''}/simulate`, { outcome }),
      );
      await this.poll(this.paiement() ?? '', 0);
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  private async poll(paymentId: string, attempt: number): Promise<void> {
    try {
      const p = await this.api.invoke(getPayment, { id: paymentId });
      this.payment.set(p);
      if (p.status !== 'pending') {
        await this.loadBooking();
        return;
      }
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
    if (attempt >= POLL_MAX) {
      this.timedOut.set(true);
      return;
    }
    if (this.payment()?.provider !== 'mock') {
      this.timer = setTimeout(() => void this.poll(paymentId, attempt + 1), POLL_MS);
    }
  }

  private async loadBooking(): Promise<void> {
    try {
      this.booking.set(await this.api.invoke(getMyBooking, { id: this.id() }));
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
