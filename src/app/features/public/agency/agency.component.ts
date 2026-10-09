import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { getPublicAgency } from '../../../api/functions';
import { AgencyDetail } from '../../../api/models';
import { BRAND } from '../../../content/brand';
import { apiErrorMessage } from '../../../core/http/api-error';
import { localDate } from '../../../shared/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { DAY_LABELS, SERVICE_LABELS } from '../../../shared/pipes/status';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { mapsUrl, todayHours, whatsappUrl } from '../agency-utils';

/** Fiche publique d'une agence : contacts, horaires, services, prochains départs. */
@Component({
  selector: 'bv-agency',
  imports: [StateComponent, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './agency.component.html',
  styleUrl: './agency.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgencyComponent {
  private readonly api = inject(Api);
  private readonly title = inject(Title);

  readonly slug = input.required<string>();

  protected readonly agency = signal<AgencyDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly dayLabels = DAY_LABELS;
  protected readonly mapsUrl = mapsUrl;
  protected readonly whatsappUrl = whatsappUrl;
  protected readonly todayHours = todayHours;
  protected readonly today = localDate();

  constructor() {
    effect(() => void this.load(this.slug()));
  }

  protected async load(slug: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const a = await this.api.invoke(getPublicAgency, { slug });
      this.agency.set(a);
      this.title.setTitle(`${a.name} — Agence ${a.company_name ?? ''} | ${BRAND.name}`);
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Agence introuvable.'));
    } finally {
      this.loading.set(false);
    }
  }
}
