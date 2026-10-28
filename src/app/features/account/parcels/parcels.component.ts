import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listMyParcels } from '../../../api/functions';
import { CustomerParcel } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { Pager } from '../../../shared/pager';
import { LoadMoreComponent } from '../../../shared/ui/load-more/load-more.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

/** Colis envoyés et reçus (reconnus par le téléphone ou l'e-mail du compte). */
@Component({
  selector: 'bv-my-parcels',
  imports: [StateComponent, LoadMoreComponent, StatusBadgeComponent, RouterLink, DatePipe],
  templateUrl: './parcels.component.html',
  styleUrl: './parcels.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyParcelsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly parcels = signal<CustomerParcel[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly received = computed(() =>
    this.parcels().filter((p) => p.direction === 'received'),
  );
  protected readonly pager = new Pager(this.parcels, (page) =>
    this.api.invoke(listMyParcels, page),
  );
  protected readonly sent = computed(() => this.parcels().filter((p) => p.direction === 'sent'));

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.pager.first();
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async more(): Promise<void> {
    try {
      await this.pager.next();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
