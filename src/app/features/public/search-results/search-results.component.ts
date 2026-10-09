import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { searchDepartures } from '../../../api/functions';
import { SearchResult } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { formatDuration, localDate } from '../../../shared/dates';
import { amenity } from '../../../shared/amenities';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { SearchFormComponent } from '../search-form/search-form.component';

@Component({
  selector: 'bv-search-results',
  imports: [SearchFormComponent, StateComponent, RouterLink, DatePipe, MoneyPipe, IconComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultsComponent {
  private readonly api = inject(Api);

  // Paramètres d'URL (?from=…&to=…&date=…)
  readonly from = input<string | undefined>();
  readonly to = input<string | undefined>();
  readonly date = input<string | undefined>();

  protected readonly results = signal<SearchResult[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly duration = formatDuration;
  protected readonly amenity = amenity;
  /** Mobile : formulaire replié derrière un résumé de la recherche. */
  protected readonly editing = signal(false);
  protected readonly cityName = (slug?: string): string =>
    (slug ?? '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('-');

  constructor() {
    effect(() => {
      void this.search(this.from() ?? '', this.to() ?? '', this.date() ?? '');
    });
  }

  protected retry(): void {
    void this.search(this.from() ?? '', this.to() ?? '', this.date() ?? '');
  }

  protected shiftDate(days: number): string {
    return localDate(days, new Date(`${this.date() || localDate()}T12:00:00+01:00`));
  }

  private async search(from: string, to: string, date: string): Promise<void> {
    if (!from || !to || !date) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      this.results.set(await this.api.invoke(searchDepartures, { from, to, date }));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** Prix après remise « réservez tôt » (arrondi à l'entier inférieur, comme le serveur). */
  protected discounted(price: number, percent: number): number {
    return price - Math.floor((price * percent) / 100);
  }
}
