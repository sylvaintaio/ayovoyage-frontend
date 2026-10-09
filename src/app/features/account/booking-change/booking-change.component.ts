import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { changeMyBooking, getMyBooking, getMyBookingPolicy, listChangeDepartures, quoteBookingChange } from '../../../api/functions';
import { BookingDetail, BookingPolicy, ChangeCandidate, ChangeQuote } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';

interface Day {
  iso: string;
  date: Date;
}

/** Date locale au format AAAA-MM-JJ (sans conversion UTC). */
export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Jours proposés : d'aujourd'hui à la fin de la fenêtre de modification (60 au plus). */
export function changeDays(windowEnd: Date, today = new Date()): Day[] {
  const days: Day[] = [];
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (d <= windowEnd && days.length < 60) {
    days.push({ iso: isoDay(d), date: new Date(d) });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** Changement de départ : choix du jour, du départ, récapitulatif du prix puis confirmation. */
@Component({
  selector: 'bv-booking-change',
  imports: [StateComponent, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './booking-change.component.html',
  styleUrl: './booking-change.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingChangeComponent {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly id = input.required<string>();

  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly policy = signal<BookingPolicy | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly day = signal<string>('');
  protected readonly departures = signal<ChangeCandidate[]>([]);
  protected readonly searching = signal(false);
  protected readonly selected = signal<ChangeCandidate | null>(null);
  protected readonly quote = signal<ChangeQuote | null>(null);
  protected readonly quoting = signal(false);
  protected readonly submitting = signal(false);
  protected readonly quoteError = signal<string | null>(null);

  protected readonly days = computed(() => {
    const end = this.policy()?.change.window_end;
    return end ? changeDays(new Date(end)) : [];
  });
  protected readonly passengers = computed(() => this.booking()?.seats.filter((s) => s.status === 'sold') ?? []);

  constructor() {
    effect(() => void this.load(this.id()));
  }

  protected async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [booking, policy] = await Promise.all([
        this.api.invoke(getMyBooking, { id }),
        this.api.invoke(getMyBookingPolicy, { id }),
      ]);
      this.booking.set(booking);
      this.policy.set(policy);
      if (policy.change.allowed) {
        const current = isoDay(new Date(booking.departure.departure_at));
        const first = this.days().find((d) => d.iso === current) ?? this.days()[0];
        if (first) {
          await this.pickDay(first.iso);
        }
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Réservation introuvable.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async pickDay(iso: string): Promise<void> {
    this.day.set(iso);
    this.selected.set(null);
    this.quote.set(null);
    this.quoteError.set(null);
    this.searching.set(true);
    try {
      this.departures.set(await this.api.invoke(listChangeDepartures, { id: this.id(), date: iso }));
    } catch (err) {
      this.departures.set([]);
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.searching.set(false);
    }
  }

  protected async select(d: ChangeCandidate): Promise<void> {
    this.selected.set(d);
    this.quote.set(null);
    this.quoteError.set(null);
    this.quoting.set(true);
    try {
      this.quote.set(await this.api.invoke(quoteBookingChange, { id: this.id(), body: { departure_id: d.id } }));
    } catch (err) {
      this.quoteError.set(apiErrorMessage(err));
    } finally {
      this.quoting.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    const d = this.selected();
    if (!d || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    try {
      const nb = await this.api.invoke(changeMyBooking, { id: this.id(), body: { departure_id: d.id } });
      if (nb.status === 'pending') {
        await this.router.navigate(['/reservation', nb.id, 'paiement']);
      } else {
        this.toast.success('Votre voyage est modifié. Vos nouveaux billets sont prêts.');
        await this.router.navigate(['/compte/reservations', nb.id]);
      }
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
      this.submitting.set(false);
    }
  }
}
