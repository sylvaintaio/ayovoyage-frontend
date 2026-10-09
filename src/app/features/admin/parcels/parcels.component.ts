import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { findParcel, listParcels } from '../../../api/functions';
import { ParcelSummary } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

const PAGE = 50;

/** Colis : recherche (numéro, nom, téléphone), filtres, accès rapide par scan. */
@Component({
  selector: 'bv-parcels',
  imports: [StateComponent, StatusBadgeComponent, IconComponent, FormsModule, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './parcels.component.html',
  styleUrl: './parcels.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly q = signal('');
  protected readonly status = signal('');
  protected readonly scan = signal('');
  protected readonly parcels = signal<ParcelSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly hasMore = signal(false);

  async ngOnInit(): Promise<void> {
    await this.load(true);
  }

  protected async load(reset = false): Promise<void> {
    this.loading.set(reset);
    this.error.set(null);
    try {
      const page = await this.api.invoke(listParcels, {
        q: this.q().replace(/\s/g, '') || undefined,
        status: (this.status() || undefined) as never,
        limit: PAGE,
        offset: reset ? 0 : this.parcels().length,
      });
      this.parcels.set(reset ? page : [...this.parcels(), ...page]);
      this.hasMore.set(page.length === PAGE);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** Scan de l'étiquette (douchette ou saisie) : ouvre directement la fiche. */
  protected async open(): Promise<void> {
    const raw = this.scan().trim();
    if (!raw) {
      return;
    }
    const tracking = raw.split('/').pop()!.split('?')[0].toUpperCase();
    try {
      const p = await this.api.invoke(findParcel, { tracking });
      this.scan.set('');
      await this.router.navigate(['/admin/colis', p.id]);
    } catch {
      this.toast.error(`Colis ${tracking} introuvable.`);
    }
  }
}
