import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listRoutes } from '../../../api/functions';
import { Route } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { formatDuration } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Lignes : arrêts dans l'ordre, prix (unique ou grille), durée. Édition dans l'éditeur de ligne. */
@Component({
  selector: 'bv-routes',
  imports: [StateComponent, RouterLink, MoneyPipe],
  templateUrl: './routes.component.html',
  styleUrl: './routes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutesComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly routes = signal<Route[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly duration = formatDuration;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.routes.set(await this.api.invoke(listRoutes));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** « Cotonou → Calavi → Bohicon → Parakou » (villes, sans répétition consécutive). */
  protected cities(r: Route): string {
    const names = r.stops.map((s) => s.city_name).filter((c, i, all) => i === 0 || c !== all[i - 1]);
    return names.join(' → ');
  }
}
