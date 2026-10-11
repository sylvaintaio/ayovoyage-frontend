import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Api } from '../../../api/api';
import { checkPromoCode, createBooking, getPublicDeparture, listMyLoyalty } from '../../../api/functions';
import { Account, DepartureDetail, PassengerInput } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage, apiErrorStatus } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { formatDuration } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { SeatMapComponent } from '../../../shared/ui/seat-map/seat-map.component';
import { BookingStepsComponent } from '../sections/booking-steps/booking-steps.component';
import { StateComponent } from '../../../shared/ui/state/state.component';

type Mode = 'manual' | 'auto';

interface Draft {
  mode: Mode;
  seats: string[];
  names: string[];
  count: number;
}

const MAX_PASSENGERS = 10;

/** Indice d'arrêt lu dans l'adresse ; absent ou invalide : trajet par défaut. */
export function seqParam(v: string | undefined): number | undefined {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** Choix des sièges, des passagers et création de la réservation. */
@Component({
  selector: 'bv-departure',
  imports: [BookingStepsComponent, SeatMapComponent, StateComponent, ReactiveFormsModule, FormsModule, DatePipe, MoneyPipe],
  templateUrl: './departure.component.html',
  styleUrl: './departure.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartureComponent {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthStore);

  readonly id = input.required<string>();
  /** Trajet choisi à la recherche (?montee=&descente=) : indices des arrêts. */
  readonly montee = input<string>();
  readonly descente = input<string>();

  protected readonly departure = signal<DepartureDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly mode = signal<Mode>('manual');
  protected readonly selectedSeats = signal<string[]>([]);
  protected readonly names = signal<string[]>([]);
  protected readonly autoCount = signal(1);
  protected readonly prefCategory = signal('');
  protected readonly prefPosition = signal<'any' | 'window' | 'aisle' | 'front'>('any');
  protected readonly prefTogether = signal(true);
  protected readonly loyalty = signal<Account | null>(null);
  protected readonly redeemPoints = signal(0);

  protected readonly maxPassengers = MAX_PASSENGERS;
  protected readonly counts = Array.from({ length: MAX_PASSENGERS }, (_, i) => i + 1);
  protected readonly duration = formatDuration;

  protected readonly contact = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(8)]],
    email: ['', Validators.email],
    billing_name: ['', Validators.maxLength(160)],
    billing_tax_id: ['', Validators.maxLength(30)],
  });
  /** Facture au nom d'une entreprise (raison sociale et IFU imprimés sur la facture). */
  protected readonly withCompany = signal(false);

  /** Arrêts proposés pour monter et descendre (ligne à arrêts intermédiaires). */
  protected readonly boardingStops = computed(() => {
    const stops = this.departure()?.stops ?? [];
    return stops.filter((s) => s.can_board && s.seq < stops.length - 1);
  });
  protected readonly alightingStops = computed(() => {
    const d = this.departure();
    return (d?.stops ?? []).filter((s) => s.can_alight && s.seq > (d?.boarding_seq ?? 0));
  });

  protected readonly cells = computed(() => {
    const map = new Map((this.departure()?.seat_map.cells ?? []).map((c) => [c.id, c]));
    return this.selectedSeats().map((id) => map.get(id)).filter((c) => !!c);
  });

  protected readonly passengerCount = computed(() =>
    this.mode() === 'manual' ? this.selectedSeats().length : this.autoCount(),
  );

  /** Prix et catégorie de chaque place choisie (avant remises). */
  protected readonly seatPrices = computed(() => {
    const d = this.departure();
    if (!d) {
      return [] as { price: number; code: string }[];
    }
    const codeOf = new Map((d.categories ?? []).map((c) => [c.id, c.code]));
    if (this.mode() === 'manual') {
      return this.cells().map((c) => ({ price: c?.price ?? 0, code: codeOf.get(c?.category_id ?? '') ?? '' }));
    }
    const cat = d.categories?.find((c) => c.code === this.prefCategory()) ?? d.categories?.find((c) => c.price === d.base_price);
    return Array.from({ length: this.autoCount() }, () => ({ price: cat?.price ?? d.base_price, code: cat?.code ?? '' }));
  });

  /** Remise « réservez tôt » sur les premières places, dans la limite du quota restant. */
  protected readonly earlyBird = computed(() => {
    const eb = this.departure()?.early_bird;
    if (!eb) {
      return 0;
    }
    return this.seatPrices()
      .slice(0, eb.seats_left)
      .reduce((sum, s) => sum + Math.floor((s.price * eb.percent) / 100), 0);
  });

  protected readonly estimate = computed(() => {
    const gross = this.seatPrices().reduce((sum, s) => sum + s.price, 0);
    return Math.max(0, gross - this.earlyBird() - (this.promo()?.valid ? this.promo()!.discount : 0));
  });

  // Code promo : vérifié à la demande, confirmé à la réservation.
  protected readonly promoInput = signal('');
  protected readonly promo = signal<{ code: string; valid: boolean; message: string; discount: number } | null>(null);
  protected readonly checkingPromo = signal(false);

  protected async applyPromo(): Promise<void> {
    const d = this.departure();
    const code = this.promoInput().trim().toUpperCase();
    if (!d || code.length < 3) {
      return;
    }
    const codes = this.seatPrices().map((s) => s.code).filter((c) => !!c);
    if (codes.length === 0) {
      this.promo.set({ code, valid: false, message: 'Choisissez d’abord vos places.', discount: 0 });
      return;
    }
    this.checkingPromo.set(true);
    try {
      const r = await this.api.invoke(checkPromoCode, { body: { departure_id: d.id, code, category_codes: codes } });
      this.promo.set({ code, valid: r.valid, message: r.valid ? (r.description ?? r.message) : r.message, discount: r.discount });
    } catch (err) {
      this.promo.set({ code, valid: false, message: apiErrorMessage(err), discount: 0 });
    } finally {
      this.checkingPromo.set(false);
    }
  }

  protected removePromo(): void {
    this.promo.set(null);
    this.promoInput.set('');
  }

  protected readonly pointValue = computed(() => {
    const l = this.loyalty();
    return l && l.points_balance > 0 ? l.points_value / l.points_balance : 0;
  });

  constructor() {
    // Les places changent : la remise du code doit être recalculée.
    effect(() => {
      this.seatPrices();
      const p = untracked(this.promo);
      if (p?.valid) {
        this.promo.set({ ...p, valid: false, message: 'Places modifiées : cliquez à nouveau sur « Appliquer ».', discount: 0 });
      }
    });
    effect(() => void this.load(this.id(), false, seqParam(this.montee()), seqParam(this.descente())));
    // Un champ « nom » par passager, conservé si le nombre change.
    effect(() => {
      const n = this.passengerCount();
      this.names.update((list) => Array.from({ length: n }, (_, i) => list[i] ?? ''));
    });
    effect(() => {
      const me = this.auth.me()?.customer;
      if (me) {
        this.contact.patchValue({ name: me.full_name, phone: me.phone ?? '', email: me.email ?? '' }, { emitEvent: false });
        this.names.update((list) => (list.length > 0 && !list[0] ? [me.full_name, ...list.slice(1)] : list));
      }
    });
  }

  protected setName(index: number, value: string): void {
    this.names.update((list) => list.map((n, i) => (i === index ? value : n)));
  }

  protected async reload(): Promise<void> {
    await this.load(this.id(), false, seqParam(this.montee()), seqParam(this.descente()));
  }

  /** Autre montée ou descente : plan, places et prix rechargés pour ce trajet ; les sièges choisis sont conservés s'ils restent libres. */
  protected async setTrip(boarding: number, alighting: number): Promise<void> {
    const d = this.departure();
    if (!d) {
      return;
    }
    if (alighting <= boarding) {
      alighting = d.stops.find((s) => s.can_alight && s.seq > boarding)?.seq ?? -1;
    }
    this.promo.set(null);
    await this.router.navigate([], { relativeTo: this.route, queryParams: { montee: boarding, descente: alighting }, replaceUrl: true });
  }

  protected async submit(): Promise<void> {
    const d = this.departure();
    if (!d) {
      return;
    }
    if (!this.auth.isCustomer()) {
      this.saveDraft();
      await this.router.navigate(['/connexion'], {
        queryParams: { retour: `/departs/${d.id}?montee=${d.boarding_seq}&descente=${d.alighting_seq}` },
      });
      return;
    }
    if (this.passengerCount() === 0) {
      this.toast.error('Choisissez au moins un siège.');
      return;
    }
    if (this.names().some((n) => n.trim().length < 2) || this.contact.invalid) {
      this.contact.markAllAsTouched();
      this.toast.error('Renseignez le nom de chaque passager et vos coordonnées.');
      return;
    }

    const names = this.names().map((n) => n.trim());
    const passengers: PassengerInput[] =
      this.mode() === 'manual'
        ? this.selectedSeats().map((seatId, i) => ({ name: names[i], seat_id: seatId }))
        : names.map((name) => ({ name }));
    const c = this.contact.getRawValue();
    if (this.withCompany() && c.billing_name.trim().length < 2) {
      this.toast.error("Indiquez la raison sociale de l'entreprise à facturer.");
      return;
    }

    this.submitting.set(true);
    try {
      const booking = await this.api.invoke(createBooking, {
        body: {
          departure_id: d.id,
          boarding_seq: d.boarding_seq,
          alighting_seq: d.alighting_seq,
          passengers,
          preferences:
            this.mode() === 'auto'
              ? {
                  category_code: this.prefCategory() || undefined,
                  position: this.prefPosition(),
                  together: this.prefTogether(),
                }
              : undefined,
          contact_name: c.name,
          contact_phone: c.phone,
          contact_email: c.email || undefined,
          billing_name: (this.withCompany() && c.billing_name.trim()) || undefined,
          billing_tax_id: (this.withCompany() && c.billing_tax_id.trim()) || undefined,
          redeem_points: this.redeemPoints() > 0 ? this.redeemPoints() : undefined,
          promo_code: this.promo()?.valid ? this.promo()!.code : undefined,
        },
      });
      sessionStorage.removeItem(this.draftKey());
      if (booking.status === 'confirmed') {
        await this.router.navigate(['/compte/reservations', booking.id]);
      } else {
        await this.router.navigate(['/reservation', booking.id, 'paiement']);
      }
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
      if (apiErrorStatus(err) === 409) {
        // Un siège vient d'être pris : on recharge le plan et on retire les sièges devenus indisponibles.
        await this.load(d.id, true, d.boarding_seq, d.alighting_seq);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  private async load(id: string, keepSelection = false, boarding?: number, alighting?: number): Promise<void> {
    const changingTrip = !keepSelection && this.departure()?.id === id;
    this.loading.set(!keepSelection && !changingTrip);
    this.error.set(null);
    try {
      const d = await this.api.invoke(getPublicDeparture, { id, boarding, alighting });
      this.departure.set(d);
      const free = new Set((d.seat_map.cells).filter((c) => c.state === 'available').map((c) => c.id));
      if (keepSelection || changingTrip) {
        this.selectedSeats.update((ids) => ids.filter((s) => free.has(s)));
      } else {
        this.restoreDraft(free);
      }
      if (this.auth.isCustomer()) {
        const accounts = await this.api.invoke(listMyLoyalty).catch(() => [] as Account[]);
        this.loyalty.set(accounts.find((a) => a.company_id === d.company_id) ?? null);
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Départ introuvable.'));
    } finally {
      this.loading.set(false);
    }
  }

  private draftKey(): string {
    return `bv-draft-${this.id()}`;
  }

  /** Conserve le choix pendant la connexion par SMS. */
  private saveDraft(): void {
    const draft: Draft = { mode: this.mode(), seats: this.selectedSeats(), names: this.names(), count: this.autoCount() };
    sessionStorage.setItem(this.draftKey(), JSON.stringify(draft));
  }

  private restoreDraft(free: Set<string>): void {
    const raw = sessionStorage.getItem(this.draftKey());
    if (!raw) {
      return;
    }
    try {
      const draft = JSON.parse(raw) as Draft;
      this.mode.set(draft.mode);
      this.autoCount.set(draft.count);
      this.selectedSeats.set(draft.seats.filter((s) => free.has(s)));
      this.names.set(draft.names);
    } catch {
      sessionStorage.removeItem(this.draftKey());
    }
  }
}
