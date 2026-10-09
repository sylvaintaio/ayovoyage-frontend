import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import {
  cancelBooking,
  getBooking,
  getBookingPolicy,
  listBookingInvoices,
} from '../../../api/functions';
import { BookingDetail, BookingPolicy, Invoice } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CHANNEL_LABELS } from '../../../shared/pipes/status';
import { InvoiceListComponent } from '../../../shared/ui/invoice-list/invoice-list.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { CollectDialogComponent } from '../collect/collect-dialog/collect-dialog.component';
import { BookingBaggageComponent } from './booking-baggage/booking-baggage.component';
import { CounterChangeComponent } from './counter-change/counter-change.component';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';

@Component({
  selector: 'bv-admin-booking-detail',
  imports: [
    ApiUrlPipe,
    StateComponent,
    StatusBadgeComponent,
    CounterChangeComponent,
    BookingBaggageComponent,
    InvoiceListComponent,
    FormsModule,
    RouterLink,
    DatePipe,
    MoneyPipe,
  ],
  templateUrl: './booking-detail.component.html',
  styleUrl: './booking-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBookingDetailComponent {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(DialogService);

  readonly id = input.required<string>();

  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showCancel = signal(false);
  protected readonly policy = signal<BookingPolicy | null>(null);
  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly showChange = signal(false);
  protected readonly reason = signal('');
  protected readonly waiveFee = signal(false);
  protected readonly busy = signal(false);
  protected readonly channels = CHANNEL_LABELS;
  protected readonly canCancel = this.auth.hasRole('company_admin', 'agency_manager');
  protected readonly canPrint = this.auth.hasRole('company_admin', 'agency_manager', 'cashier');
  protected readonly canChange = this.auth.hasRole('company_admin', 'agency_manager', 'cashier');
  protected readonly canInvoices = this.auth.hasRole(
    'company_admin',
    'agency_manager',
    'cashier',
    'finance',
    'parcel_agent',
  );
  protected readonly canBaggage = this.auth.hasRole(
    'company_admin',
    'agency_manager',
    'cashier',
    'boarding_agent',
    'driver',
  );

  constructor() {
    effect(() => void this.load(this.id()));
  }

  protected async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.booking.set(await this.api.invoke(getBooking, { id }));
      this.showChange.set(false);
      this.policy.set(null);
      this.invoices.set([]);
      if (this.canInvoices) {
        this.api.invoke(listBookingInvoices, { id }).then(
          (list) => this.invoices.set(list),
          () => this.invoices.set([]),
        );
      }
      if (this.canChange) {
        // Conditions chargées en parallèle : la fiche s'affiche sans attendre.
        this.api.invoke(getBookingPolicy, { id }).then(
          (p) => this.policy.set(p),
          () => this.policy.set(null),
        );
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async cancel(): Promise<void> {
    const b = this.booking();
    if (!b || this.reason().trim().length < 3) {
      this.toast.error("Indiquez le motif de l'annulation.");
      return;
    }
    this.busy.set(true);
    try {
      this.booking.set(
        await this.api.invoke(cancelBooking, {
          id: b.id,
          body: { reason: this.reason().trim(), waive_fee: this.waiveFee() },
        }),
      );
      this.showCancel.set(false);
      this.toast.success(
        'Réservation annulée. La demande de remboursement est dans « Remboursements ».',
      );
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected collectable(b: BookingDetail): boolean {
    return new Date(b.expires_at).getTime() > Date.now();
  }

  protected async collect(b: BookingDetail): Promise<void> {
    const detail = await this.dialog.open<BookingDetail, BookingDetail>(CollectDialogComponent, {
      ...b,
      route_name: b.departure.route_name,
      departure_at: b.departure.departure_at,
    });
    if (detail) {
      this.toast.success(`${detail.reference} encaissée : billets et facture émis.`);
      await this.load(detail.id);
    }
  }

  protected async changed(nb: BookingDetail): Promise<void> {
    this.toast.success(`Voyage modifié : nouvelle réservation ${nb.reference}, billets émis.`);
    await this.router.navigate(['/admin/reservations', nb.id]);
  }
}
