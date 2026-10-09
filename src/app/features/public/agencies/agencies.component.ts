import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listCities, listPublicAgencies } from '../../../api/functions';
import { Agency, City } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { SERVICE_LABELS } from '../../../shared/pipes/status';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';
import { mapsUrl, todayHours } from '../agency-utils';

type Service = 'ticketing' | 'parcel_drop' | 'parcel_pickup' | 'lounge' | '';

/** Page publique « Agences » : recherche par ville, service ou nom. */
@Component({
  selector: 'bv-agencies',
  imports: [StateComponent, FormsModule, RouterLink, PageBannerComponent],
  templateUrl: './agencies.component.html',
  styleUrl: './agencies.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgenciesComponent implements OnInit {
  private readonly api = inject(Api);

  protected readonly agencies = signal<Agency[]>([]);
  protected readonly cities = signal<City[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly city = signal('');
  /** Paramètre d'URL ?service=… (ex. depuis la page Colis). */
  readonly service = input<Service | undefined>();
  protected readonly serviceFilter = signal<Service>('');
  protected readonly query = signal('');

  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly services = Object.entries(SERVICE_LABELS) as [Service, string][];
  protected readonly mapsUrl = mapsUrl;
  protected readonly todayHours = todayHours;

  /** Filtrage local instantané (la liste complète est légère). */
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.agencies().filter(
      (a) =>
        (!this.city() || a.city_slug === this.city()) &&
        (!this.serviceFilter() || a.services.includes(this.serviceFilter())) &&
        (!q || `${a.name} ${a.city_name} ${a.address} ${a.landmark}`.toLowerCase().includes(q)),
    );
  });

  async ngOnInit(): Promise<void> {
    this.serviceFilter.set(this.service() ?? '');
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [agencies, cities] = await Promise.all([this.api.invoke(listPublicAgencies, {}), this.api.invoke(listCities)]);
      this.agencies.set(agencies);
      const used = new Set(agencies.map((a) => a.city_slug));
      this.cities.set(cities.filter((c) => used.has(c.slug)));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
