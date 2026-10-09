import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../api/api';
import { listAuditLogs } from '../../../api/functions';
import { AuditEntry } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { StateComponent } from '../../../shared/ui/state/state.component';

const PAGE = 50;

/** Journal des actions sensibles (ventes, annulations, remboursements, tarifs, droits). */
@Component({
  selector: 'bv-audit',
  imports: [StateComponent, FormsModule, DatePipe, JsonPipe],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly entityType = signal('');
  protected readonly entries = signal<AuditEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly hasMore = signal(false);
  protected readonly open = signal<number | null>(null);

  protected readonly types = [
    ['', 'Tout'], ['booking', 'Réservations'], ['refund', 'Remboursements'], ['departure', 'Départs'],
    ['route', 'Lignes'], ['seat_category', 'Catégories'], ['staff', 'Personnel'], ['device', 'Terminaux'],
    ['loyalty_account', 'Fidélité'], ['company', 'Paramètres'],
  ];

  async ngOnInit(): Promise<void> {
    await this.load(true);
  }

  protected async load(reset = false): Promise<void> {
    this.loading.set(reset);
    this.error.set(null);
    try {
      const page = await this.api.invoke(listAuditLogs, {
        entity_type: this.entityType() || undefined,
        limit: PAGE,
        offset: reset ? 0 : this.entries().length,
      });
      this.entries.set(reset ? page : [...this.entries(), ...page]);
      this.hasMore.set(page.length === PAGE);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
