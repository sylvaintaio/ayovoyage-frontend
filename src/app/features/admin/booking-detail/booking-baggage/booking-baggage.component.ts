import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../../api/api';
import { checkBaggage, listBookingBaggage } from '../../../../api/functions';
import { Baggage, BookingDetail } from '../../../../api/models';
import { AuthStore } from '../../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/notify/toast.service';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { API_URL } from '../../../../core/http/api-url';

/** Bagages en soute d'une réservation : pesée, étiquette QR, excédent. */
@Component({
  selector: 'bv-booking-baggage',
  imports: [FormsModule, MoneyPipe, IconComponent, StatusBadgeComponent],
  templateUrl: './booking-baggage.component.html',
  styleUrl: './booking-baggage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingBaggageComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);

  readonly booking = input.required<BookingDetail>();

  protected readonly bags = signal<Baggage[]>([]);
  protected readonly seatId = signal('');
  protected readonly weight = signal<number | null>(null);
  protected readonly description = signal('');
  protected readonly waive = signal(false);
  protected readonly busy = signal(false);
  protected readonly canWaive = this.auth.hasRole('company_admin', 'agency_manager');

  protected readonly passengers = computed(() =>
    this.booking().seats.filter((s) => s.status === 'sold'),
  );
  protected readonly open = computed(() => {
    const b = this.booking();
    return (
      b.status === 'confirmed' &&
      (b.departure.status === 'scheduled' || b.departure.status === 'boarding')
    );
  });
  /** Poids déjà enregistré pour le passager choisi. */
  protected readonly already = computed(() =>
    this.bags()
      .filter((b) => b.booking_seat_id === this.seatId())
      .reduce((s, b) => s + b.weight_kg, 0),
  );

  async ngOnInit(): Promise<void> {
    this.seatId.set(this.passengers()[0]?.booking_seat_id ?? '');
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.bags.set(await this.api.invoke(listBookingBaggage, { id: this.booking().id }));
    } catch {
      this.bags.set([]);
    }
  }

  protected async add(): Promise<void> {
    const w = Number(this.weight());
    if (!this.seatId() || !(w > 0) || this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const b = await this.api.invoke(checkBaggage, {
        id: this.booking().id,
        body: {
          booking_seat_id: this.seatId(),
          weight_kg: w,
          description: this.description().trim() || undefined,
          waive_fee: this.waive() || undefined,
        },
      });
      this.toast.success(
        b.extra_fee
          ? `Bagage ${b.tag_number} : excédent de ${b.extra_fee} F encaissé.`
          : `Bagage ${b.tag_number} enregistré.`,
      );
      this.weight.set(null);
      this.description.set('');
      this.waive.set(false);
      await this.load();
      window.open(this.label(b.id), '_blank', 'noopener');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected label(id: string): string {
    return `${API_URL}/v1/admin/baggage/${id}/label`;
  }
}
