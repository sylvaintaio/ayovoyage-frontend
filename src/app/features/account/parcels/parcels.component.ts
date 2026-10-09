import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listMyParcels } from '../../../api/functions';
import { CustomerParcel } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

/** Colis envoyés et reçus (reconnus par le téléphone ou l'e-mail du compte). */
@Component({
  selector: 'bv-my-parcels',
  imports: [StateComponent, StatusBadgeComponent, RouterLink, DatePipe],
  templateUrl: './parcels.component.html',
  styleUrl: './parcels.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyParcelsComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly parcels = signal<CustomerParcel[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly received = computed(() => this.parcels().filter((p) => p.direction === 'received'));
  protected readonly sent = computed(() => this.parcels().filter((p) => p.direction === 'sent'));

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.parcels.set(await this.api.invoke(listMyParcels));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
