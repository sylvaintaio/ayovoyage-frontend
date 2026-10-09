import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../../api/api';
import { changeBookingCounter, listAgencies, listBookingChangeDepartures, quoteBookingChangeCounter } from '../../../../api/functions';
import { Agency, BookingDetail, BookingPolicy, ChangeCandidate, ChangeQuote } from '../../../../api/models';
import { AuthStore } from '../../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { isoDay } from '../../../account/booking-change/booking-change.component';

/** Modification au guichet : nouveau départ, prix, encaissement en espèces. */
@Component({
  selector: 'bv-counter-change',
  imports: [FormsModule, DatePipe, MoneyPipe],
  templateUrl: './counter-change.component.html',
  styleUrl: './counter-change.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterChangeComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthStore);

  readonly booking = input.required<BookingDetail>();
  readonly policy = input.required<BookingPolicy>();
  readonly changed = output<BookingDetail>();
  readonly closed = output<void>();

  /** Personnel du siège (sans agence) : choisit l'agence d'encaissement. */
  protected readonly needsAgency = !this.auth.me()?.staff?.agency_id;
  protected readonly agencies = signal<Agency[]>([]);
  protected readonly agencyId = signal('');

  protected readonly day = signal(isoDay(new Date()));
  protected readonly minDay = isoDay(new Date());
  protected readonly maxDay = computed(() => {
    const end = this.policy().change.window_end;
    return end ? isoDay(new Date(end)) : '';
  });
  protected readonly departures = signal<ChangeCandidate[]>([]);
  protected readonly searching = signal(false);
  protected readonly selected = signal<ChangeCandidate | null>(null);
  protected readonly waiveFee = signal(false);
  protected readonly quote = signal<ChangeQuote | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

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
    this.day.set(isoDay(new Date(this.booking().departure.departure_at)));
    await this.search();
  }

  private body(d: ChangeCandidate) {
    return { departure_id: d.id, waive_fee: this.waiveFee(), agency_id: this.needsAgency ? this.agencyId() || undefined : undefined };
  }

  protected async search(): Promise<void> {
    this.selected.set(null);
    this.quote.set(null);
    this.error.set(null);
    this.searching.set(true);
    try {
      this.departures.set(await this.api.invoke(listBookingChangeDepartures, { id: this.booking().id, date: this.day() }));
    } catch (err) {
      this.departures.set([]);
      this.error.set(apiErrorMessage(err));
    } finally {
      this.searching.set(false);
    }
  }

  protected async select(d: ChangeCandidate | null = this.selected()): Promise<void> {
    if (!d) {
      return;
    }
    this.selected.set(d);
    this.quote.set(null);
    this.error.set(null);
    try {
      this.quote.set(await this.api.invoke(quoteBookingChangeCounter, { id: this.booking().id, body: this.body(d) }));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    }
  }

  protected async toggleWaive(v: boolean): Promise<void> {
    this.waiveFee.set(v);
    await this.select();
  }

  protected async confirm(): Promise<void> {
    const d = this.selected();
    if (!d || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      this.changed.emit(await this.api.invoke(changeBookingCounter, { id: this.booking().id, body: this.body(d) }));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
