import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listBookings } from '../../../api/functions';
import { Booking, BookingDetail } from '../../../api/models';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { CollectDialogComponent } from './collect-dialog/collect-dialog.component';

/**
 * Guichet : réservations à encaisser. Sans recherche, la file des réservations
 * « payer en agence » ; avec une référence ou un téléphone, toute réservation en attente.
 */
@Component({
  selector: 'bv-collect',
  imports: [StateComponent, FormsModule, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './collect.component.html',
  styleUrl: './collect.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly q = signal('');
  protected readonly searched = signal('');
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    const q = this.q().trim();
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await this.api.invoke(listBookings, {
        status: 'pending',
        payment_mode: q ? undefined : 'agency',
        q: q || undefined,
        limit: 100,
      });
      // Les plus urgentes d'abord ; les réservations expirées attendent leur libération automatique.
      const now = Date.now();
      this.bookings.set(
        list
          .filter((b) => new Date(b.expires_at).getTime() > now)
          .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()),
      );
      this.searched.set(q);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected urgent(b: Booking): boolean {
    return new Date(b.expires_at).getTime() - Date.now() < 3 * 3600_000;
  }

  protected async collect(b: Booking): Promise<void> {
    const detail = await this.dialog.open<BookingDetail, Booking>(CollectDialogComponent, b);
    if (detail) {
      this.toast.success(`${detail.reference} encaissée : billets et facture émis.`);
      await this.router.navigate(['/admin/reservations', detail.id]);
    }
  }
}
