import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { getMyBooking, listMyBookingBaggage, reportTripProblem } from '../../../api/functions';
import { Baggage, BookingDetail } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { INCIDENT_CATEGORY_LABELS } from '../../../shared/pipes/status';
import { PhotoPickerComponent } from '../../../shared/ui/photo-picker/photo-picker.component';
import { StateComponent } from '../../../shared/ui/state/state.component';

type Category = 'not_received' | 'delayed' | 'damaged' | 'opened' | 'lost' | 'other';

const TRIP: Category[] = ['delayed', 'damaged', 'lost', 'other'];
const BAG: Category[] = ['lost', 'damaged', 'opened', 'delayed', 'other'];

/** Signalement d'un problème sur un voyage ou un bagage, depuis la réservation. */
@Component({
  selector: 'bv-incident-new',
  imports: [StateComponent, FormsModule, RouterLink, PhotoPickerComponent],
  templateUrl: './incident-new.component.html',
  styleUrl: './incident-new.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentNewComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly reservation = input.required<string>();

  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly bags = signal<Baggage[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly tag = signal('');
  protected readonly category = signal<Category>('lost');
  protected readonly description = signal('');
  protected readonly photos = signal<string[]>([]);
  protected readonly sending = signal(false);

  protected readonly options = computed(() => (this.tag() ? BAG : TRIP).map((c) => [c, INCIDENT_CATEGORY_LABELS[c]] as const));

  async ngOnInit(): Promise<void> {
    try {
      const [b, bags] = await Promise.all([
        this.api.invoke(getMyBooking, { id: this.reservation() }),
        this.api.invoke(listMyBookingBaggage, { id: this.reservation() }).catch(() => [] as Baggage[]),
      ]);
      this.booking.set(b);
      this.bags.set(bags);
      this.tag.set(bags[0]?.tag_number ?? '');
      this.category.set(bags.length ? 'lost' : 'delayed');
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Réservation introuvable.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected setTag(t: string): void {
    this.tag.set(t);
    this.category.set(t ? 'lost' : 'delayed');
  }

  protected async send(): Promise<void> {
    this.sending.set(true);
    try {
      const r = await this.api.invoke(reportTripProblem, {
        body: {
          booking_id: this.reservation(),
          baggage_tag: this.tag() || undefined,
          category: this.category(),
          description: this.description().trim(),
          photos: this.photos().length ? this.photos() : undefined,
        },
      });
      this.toast.success(`Réclamation ${r.reference} enregistrée. Nous revenons vers vous rapidement.`);
      await this.router.navigateByUrl('/compte/reclamations');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.sending.set(false);
    }
  }
}
