import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listAgencies } from '../../../api/functions';
import { Agency } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { SERVICE_LABELS } from '../../../shared/pipes/status';
import { StateComponent } from '../../../shared/ui/state/state.component';

@Component({
  selector: 'bv-admin-agencies',
  imports: [StateComponent, RouterLink],
  templateUrl: './agencies.component.html',
  styleUrl: './agencies.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAgenciesComponent implements OnInit {
  private readonly api = inject(Api);
  protected readonly auth = inject(AuthStore);

  protected readonly agencies = signal<Agency[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly services = SERVICE_LABELS;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.agencies.set(await this.api.invoke(listAgencies));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** Un chef d'agence ne peut modifier que la sienne. */
  protected canEdit(a: Agency): boolean {
    return this.auth.hasRole('company_admin') || this.auth.me()?.staff?.agency_id === a.id;
  }
}
