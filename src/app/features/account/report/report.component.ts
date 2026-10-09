import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listMyBookings, listMyParcels, reportParcelProblem } from '../../../api/functions';
import { Booking, CustomerParcel } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { INCIDENT_CATEGORY_LABELS } from '../../../shared/pipes/status';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PhotoPickerComponent } from '../../../shared/ui/photo-picker/photo-picker.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

type Subject = 'trip' | 'parcel';
type Category = 'not_received' | 'delayed' | 'damaged' | 'opened' | 'wrong_recipient' | 'wrong_agency' | 'info_error' | 'lost' | 'other';

/**
 * Point d'entrée unique « Signaler un problème » (lien visible sur tout le site).
 * Réservé aux clients connectés : le garde de l'espace client renvoie vers la
 * connexion puis ramène ici.
 */
@Component({
  selector: 'bv-report',
  imports: [FormsModule, RouterLink, DatePipe, IconComponent, PhotoPickerComponent, StatusBadgeComponent],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);

  /** Pré-sélection depuis le suivi d'un colis (?colis=CL…). */
  readonly colis = input<string | undefined>();

  protected readonly subject = signal<Subject | null>(null);
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly parcels = signal<CustomerParcel[]>([]);
  protected readonly loading = signal(true);

  // Colis
  protected readonly tracking = signal('');
  protected readonly phone = signal('');
  protected readonly category = signal<Category>('delayed');
  protected readonly description = signal('');
  protected readonly photos = signal<string[]>([]);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly categories = Object.entries(INCIDENT_CATEGORY_LABELS) as [Category, string][];

  async ngOnInit(): Promise<void> {
    this.phone.set(this.auth.me()?.customer?.phone ?? '');
    if (this.colis()) {
      this.subject.set('parcel');
      this.tracking.set(this.colis()!.toUpperCase());
    }
    const [bookings, parcels] = await Promise.all([
      this.api.invoke(listMyBookings, { limit: 20 }).catch(() => [] as Booking[]),
      this.api.invoke(listMyParcels).catch(() => [] as CustomerParcel[]),
    ]);
    this.bookings.set(bookings.filter((b) => b.status === 'confirmed' || b.status === 'changed' || b.status === 'cancelled'));
    this.parcels.set(parcels);
    this.loading.set(false);
  }

  protected chooseBooking(b: Booking): void {
    void this.router.navigate(['/compte/reclamations/nouvelle'], { queryParams: { reservation: b.id } });
  }

  protected canSend(): boolean {
    return this.tracking().trim().length >= 6 && this.phone().replace(/\D/g, '').length >= 8 && this.description().trim().length >= 10;
  }

  protected async sendParcel(): Promise<void> {
    this.sending.set(true);
    this.error.set(null);
    try {
      const tracking = this.tracking().trim().split('/').pop()!.toUpperCase();
      const r = await this.api.invoke(reportParcelProblem, {
        tracking,
        body: {
          phone: this.phone(),
          name: this.auth.displayName() || 'Client',
          category: this.category(),
          description: this.description().trim(),
          photos: this.photos().length ? this.photos() : undefined,
        },
      });
      this.toast.success(`Réclamation ${r.reference} enregistrée. Nous revenons vers vous rapidement.`);
      await this.router.navigateByUrl('/compte/reclamations');
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.sending.set(false);
    }
  }
}
