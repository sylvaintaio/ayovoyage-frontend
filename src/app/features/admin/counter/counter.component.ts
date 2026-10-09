import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import {
  createCounterBooking,
  getDeparture,
  listAgencies,
  listBookingInvoices,
  listDepartures,
} from '../../../api/functions';
import {
  AdminDeparture,
  Agency,
  BookingDetail,
  GetDepartureResponse,
  Invoice,
} from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage, apiErrorStatus } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { localDate } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { invoicePdfUrl } from '../../../shared/ui/invoice-list/invoice-list.component';
import { SeatMapComponent } from '../../../shared/ui/seat-map/seat-map.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';

/**
 * Vente au guichet : choix du départ, des sièges et encaissement en espèces.
 * Le siège vendu disparaît immédiatement de l'application et du site.
 */
@Component({
  selector: 'bv-counter',
  imports: [
    ApiUrlPipe,
    StateComponent,
    SeatMapComponent,
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    MoneyPipe,
  ],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);

  protected readonly date = signal(localDate());
  protected readonly departures = signal<AdminDeparture[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly current = signal<GetDepartureResponse | null>(null);
  protected readonly selected = signal<string[]>([]);
  protected readonly names = signal<string[]>([]);
  protected readonly selling = signal(false);
  protected readonly sold = signal<BookingDetail | null>(null);
  protected readonly soldInvoice = signal<Invoice | null>(null);
  protected readonly withCompany = signal(false);

  /** Personnel du siège (sans agence) : choisit l'agence où l'encaissement est enregistré. */
  protected readonly needsAgency = !this.auth.me()?.staff?.agency_id;
  protected readonly agencies = signal<Agency[]>([]);
  protected readonly agencyId = signal('');

  protected readonly contact = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(8)]],
    email: ['', Validators.email],
    billing_name: ['', Validators.maxLength(160)],
    billing_tax_id: ['', Validators.maxLength(30)],
  });

  protected readonly cells = computed(() => {
    const byId = new Map((this.current()?.seat_map.cells ?? []).map((c) => [c.id, c]));
    return this.selected().map((id) => byId.get(id));
  });
  protected readonly total = computed(() =>
    this.cells().reduce((sum, c) => sum + (c?.price ?? 0), 0),
  );

  constructor() {
    effect(() => {
      const n = this.selected().length;
      this.names.update((list) => Array.from({ length: n }, (_, i) => list[i] ?? ''));
    });
  }

  async ngOnInit(): Promise<void> {
    if (this.needsAgency) {
      this.api.invoke(listAgencies).then(
        (list) => {
          const open = list.filter((a) => a.is_active);
          this.agencies.set(open);
          this.agencyId.set(open[0]?.id ?? '');
        },
        () => undefined,
      );
    }
    await this.loadDepartures();
  }

  protected async loadDepartures(): Promise<void> {
    const date = this.date();
    this.loading.set(true);
    this.error.set(null);
    try {
      const agencyId = this.auth.hasRole('company_admin')
        ? undefined
        : this.auth.me()?.staff?.agency_id;
      const list = await this.api.invoke(listDepartures, {
        from: date,
        origin_agency_id: agencyId,
      });
      // Réponse d'une date abandonnée entre-temps : ignorée.
      if (date === this.date()) {
        this.departures.set(
          list.filter((d) => d.status === 'scheduled' || d.status === 'boarding'),
        );
      }
    } catch (err) {
      if (date === this.date()) {
        this.error.set(apiErrorMessage(err));
      }
    } finally {
      if (date === this.date()) {
        this.loading.set(false);
      }
    }
  }

  protected async choose(id: string): Promise<void> {
    this.sold.set(null);
    this.soldInvoice.set(null);
    this.selected.set([]);
    try {
      this.current.set(await this.api.invoke(getDeparture, { id }));
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  protected invoicePdf(inv: Invoice, format: 'a4' | 'ticket'): string {
    return invoicePdfUrl(inv.id, 'admin', format);
  }

  protected setName(i: number, value: string): void {
    this.names.update((list) => list.map((n, j) => (j === i ? value : n)));
  }

  protected async sell(): Promise<void> {
    const dep = this.current()?.departure;
    if (!dep || this.selected().length === 0) {
      return;
    }
    // Passager sans nom : on reprend le nom du client.
    const fallback = this.contact.getRawValue().name.trim();
    const names = this.names().map((n) => n.trim() || fallback);
    if (this.contact.invalid || names.some((n) => n.length < 2)) {
      this.contact.markAllAsTouched();
      this.toast.error('Renseignez le contact et le nom de chaque passager.');
      return;
    }
    const c = this.contact.getRawValue();
    if (this.withCompany() && c.billing_name.trim().length < 2) {
      this.toast.error("Indiquez la raison sociale de l'entreprise à facturer.");
      return;
    }
    this.selling.set(true);
    try {
      const booking = await this.api.invoke(createCounterBooking, {
        body: {
          departure_id: dep.id,
          passengers: this.selected().map((seatId, i) => ({ name: names[i], seat_id: seatId })),
          agency_id: this.needsAgency ? this.agencyId() || undefined : undefined,
          contact_name: c.name,
          contact_phone: c.phone,
          contact_email: c.email || undefined,
          billing_name: (this.withCompany() && c.billing_name.trim()) || undefined,
          billing_tax_id: (this.withCompany() && c.billing_tax_id.trim()) || undefined,
        },
      });
      this.sold.set(booking);
      this.toast.success(
        `Vente ${booking.reference} enregistrée : ${booking.total_amount} F CFA encaissés.`,
      );
      this.contact.reset();
      this.withCompany.set(false);
      this.selected.set([]);
      await Promise.all([this.choose(dep.id), this.loadDepartures()]);
      this.sold.set(booking);
      // La facture est émise avec l'encaissement ; son absence ne bloque pas la vente.
      this.api.invoke(listBookingInvoices, { id: booking.id }).then(
        (list) => this.soldInvoice.set(list.find((i) => i.kind === 'invoice') ?? null),
        () => this.soldInvoice.set(null),
      );
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
      if (apiErrorStatus(err) === 409) {
        await this.choose(dep.id);
      }
    } finally {
      this.selling.set(false);
    }
  }
}
