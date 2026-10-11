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
  DepartureStop,
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
 * Montée par défaut au guichet : l'arrêt de l'agence du vendeur, sinon le premier arrêt de montée.
 * Un arrêt que le car a déjà quitté n'est plus proposé.
 */
export function defaultBoarding(stops: DepartureStop[], agencyId: string | undefined, departed: Set<number>): number {
  const open = stops.filter((s) => s.can_board && s.seq < stops.length - 1 && !departed.has(s.seq));
  return (open.find((s) => agencyId && s.agency_id === agencyId) ?? open[0])?.seq ?? 0;
}

/**
 * Vente au guichet : choix du départ, du trajet (montée → descente), des sièges et encaissement en espèces.
 * Le siège vendu disparaît immédiatement de l'application et du site, sur les tronçons du trajet.
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
  /** Trajet vendu : indices des arrêts de montée et de descente. */
  protected readonly boarding = signal(0);
  protected readonly alighting = signal(1);
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

  protected readonly stops = computed(() => this.current()?.departure.stops ?? []);
  /** Arrêts déjà quittés par le car (journal du contrôleur) : plus de montée possible. */
  private readonly departed = computed(
    () => new Set((this.current()?.departure.visits ?? []).filter((v) => v.seq != null && v.departed_at).map((v) => v.seq!)),
  );
  protected readonly boardingStops = computed(() => {
    const stops = this.stops();
    return stops.filter((s) => s.can_board && s.seq < stops.length - 1 && !this.departed().has(s.seq));
  });
  protected readonly alightingStops = computed(() =>
    this.stops().filter((s) => s.can_alight && s.seq > this.boarding()),
  );

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
          // Car en route : la vente reste possible pour monter aux arrêts suivants.
          list.filter((d) => d.status === 'scheduled' || d.status === 'boarding' || d.status === 'departed'),
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
      const full = await this.api.invoke(getDeparture, { id });
      const stops = full.departure.stops ?? [];
      const departed = new Set((full.departure.visits ?? []).filter((v) => v.seq != null && v.departed_at).map((v) => v.seq!));
      const boarding = defaultBoarding(stops, this.auth.me()?.staff?.agency_id, departed);
      const alighting = Math.max(stops.length - 1, 1);
      // Plan et prix du tronçon vendu (sans arrêt intermédiaire : tout le trajet, déjà chargé).
      this.current.set(
        boarding === full.boarding_seq && alighting === full.alighting_seq
          ? full
          : await this.api.invoke(getDeparture, { id, boarding, alighting }),
      );
      this.boarding.set(this.current()!.boarding_seq);
      this.alighting.set(this.current()!.alighting_seq);
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  /** Changement de montée ou de descente : plan et prix rechargés pour ce tronçon. */
  protected async setTrip(boarding: number, alighting: number): Promise<void> {
    const id = this.current()?.departure.id;
    if (!id) {
      return;
    }
    if (alighting <= boarding) {
      alighting = this.stops().find((s) => s.can_alight && s.seq > boarding)?.seq ?? this.stops().length - 1;
    }
    this.selected.set([]);
    try {
      const cur = await this.api.invoke(getDeparture, { id, boarding, alighting });
      this.current.set(cur);
      this.boarding.set(cur.boarding_seq);
      this.alighting.set(cur.alighting_seq);
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
          boarding_seq: this.boarding(),
          alighting_seq: this.alighting(),
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
