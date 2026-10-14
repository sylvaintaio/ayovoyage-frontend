import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
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
  createStaffPayment,
  getBooking,
  getDeparture,
  getStaffPayment,
  listPaymentProviders,
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
  ProviderInfo,
} from '../../../api/models';

type PayMode = 'cash' | 'mobile_money' | 'online' | 'later';
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
export class CounterComponent implements OnInit, OnDestroy {
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

  /** Mode de paiement : espèces, Mobile Money reçu, Mobile Money du voyageur (en ligne), ou réservation à payer. */
  protected readonly payMode = signal<PayMode>('cash');
  protected readonly payRef = signal('');
  /** Paiement en ligne lancé : en attente de la confirmation du voyageur sur son téléphone. */
  protected readonly waiting = signal<{ booking: BookingDetail; departureId: string; paymentId: string; url: string } | null>(null);
  /** Réservation prise sans paiement (appel) : à encaisser avant l'heure limite. */
  protected readonly reserved = signal<BookingDetail | null>(null);
  private providers: ProviderInfo[] = [];

  protected readonly payModes: { code: PayMode; label: string; hint: string }[] = [
    { code: 'cash', label: 'Espèces', hint: 'Le voyageur paie au guichet.' },
    { code: 'online', label: 'Mobile Money du voyageur', hint: 'Il valide sur son téléphone, même un téléphone simple.' },
    { code: 'mobile_money', label: 'Mobile Money déjà reçu', hint: 'Transfert reçu sur le numéro de l’agence (référence).' },
    { code: 'later', label: 'Réserver, paiement plus tard', hint: 'Appel : places gardées 2 h, au plus tard 1 h avant le départ.' },
  ];

  protected readonly submitLabel = computed(
    () =>
      ({
        cash: 'Encaisser en espèces',
        online: 'Demander le paiement',
        mobile_money: 'Valider le paiement reçu',
        later: 'Réserver',
      })[this.payMode()],
  );
  private poll?: ReturnType<typeof setInterval>;

  /** Personnel du siège (sans agence) : choisit l'agence où l'encaissement est enregistré. */
  protected readonly needsAgency = !this.auth.me()?.staff?.agency_id;
  protected readonly agencies = signal<Agency[]>([]);
  protected readonly agencyId = signal('');

  protected readonly contact = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.minLength(8)]],
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

  /** Fournisseur en ligne : le vrai (FedaPay) s'il existe, sinon le paiement simulé (recette). */
  private onlineProvider(): string | undefined {
    return (this.providers.find((p) => p.code !== 'mock') ?? this.providers[0])?.code;
  }

  async ngOnInit(): Promise<void> {
    this.api.invoke(listPaymentProviders).then(
      (list) => (this.providers = list),
      () => undefined,
    );
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

  private resetForm(): void {
    this.contact.reset();
    this.withCompany.set(false);
    this.selected.set([]);
    this.payRef.set('');
  }

  /** Paiement Mobile Money du voyageur : page du fournisseur ouverte sur l'écran de l'agent, le voyageur confirme sur son téléphone. */
  private async startOnlinePayment(booking: BookingDetail, departureId: string): Promise<void> {
    const provider = this.onlineProvider();
    if (!provider) {
      this.toast.error('Aucun paiement en ligne n’est activé : encaissez en espèces ou réservez.');
      return;
    }
    const payment = await this.api.invoke(createStaffPayment, {
      id: booking.id,
      'Idempotency-Key': crypto.randomUUID(),
      body: { provider, method: 'mobile_money', payer_phone: booking.contact_phone },
    });
    const url = payment.checkout_url ?? '';
    this.waiting.set({ booking, departureId, paymentId: payment.id, url });
    this.openCheckout();
    this.stopPolling();
    const started = Date.now();
    this.poll = setInterval(() => {
      if (Date.now() - started > 15 * 60_000) {
        this.stopPolling();
        return;
      }
      void this.checkPayment();
    }, 4000);
  }

  protected openCheckout(): void {
    const url = this.waiting()?.url;
    if (url) {
      window.open(url, 'paiement', 'popup,width=480,height=760');
    }
  }

  /** Statut vérifié auprès du fournisseur ; confirmé → billets à imprimer. */
  protected async checkPayment(): Promise<void> {
    const w = this.waiting();
    if (!w) {
      return;
    }
    try {
      const p = await this.api.invoke(getStaffPayment, { id: w.paymentId });
      if (p.booking_status === 'confirmed') {
        this.stopPolling();
        this.waiting.set(null);
        const detail = await this.api.invoke(getBooking, { id: w.booking.id });
        this.resetForm();
        await Promise.all([this.choose(w.departureId), this.loadDepartures()]);
        this.sold.set(detail);
        this.toast.success(`Paiement reçu : vente ${detail.reference} confirmée.`);
      } else if (p.status === 'failed' || p.status === 'cancelled') {
        this.stopPolling();
        this.toast.error('Paiement refusé ou annulé par le voyageur.');
      }
    } catch {
      // réseau : nouvel essai au prochain passage
    }
  }

  protected cancelWaiting(): void {
    this.stopPolling();
    this.waiting.set(null);
  }

  private stopPolling(): void {
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
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
    const mode = this.payMode();
    if (mode !== 'cash' && c.phone.replace(/\D/g, '').length < 8) {
      this.contact.controls.phone.markAsTouched();
      this.toast.error('Le téléphone du voyageur est obligatoire pour ce mode de paiement.');
      return;
    }
    if (mode === 'mobile_money' && this.payRef().trim().length < 4) {
      this.toast.error('Saisissez la référence de la transaction Mobile Money reçue.');
      return;
    }
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
          contact_phone: c.phone || undefined,
          payment: mode,
          payment_reference: mode === 'mobile_money' ? this.payRef().trim() : undefined,
          contact_email: c.email || undefined,
          billing_name: (this.withCompany() && c.billing_name.trim()) || undefined,
          billing_tax_id: (this.withCompany() && c.billing_tax_id.trim()) || undefined,
        },
      });
      if (mode === 'later') {
        this.reserved.set(booking);
        this.toast.success(`Réservation ${booking.reference} : places gardées, SMS envoyé au voyageur.`);
        this.resetForm();
        await Promise.all([this.choose(dep.id), this.loadDepartures()]);
        this.reserved.set(booking);
        return;
      }
      if (mode === 'online') {
        await this.startOnlinePayment(booking, dep.id);
        return;
      }
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
