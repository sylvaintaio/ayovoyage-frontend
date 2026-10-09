import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShowcasePolicy, ShowcaseTier } from '../../../api/models';
import { ShowcaseStore } from '../../../content/showcase.store';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CtaBandComponent } from '../sections/cta-band/cta-band.component';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';

interface CompanyConditions {
  policy: ShowcasePolicy;
  /** Niveaux de fidélité qui améliorent les conditions. */
  perks: ShowcaseTier[];
}

/** Conditions de voyage : annulation, modification, remboursement — valeurs réelles de chaque compagnie. */
@Component({
  selector: 'bv-conditions',
  imports: [PageBannerComponent, CtaBandComponent, RouterLink, MoneyPipe],
  templateUrl: './conditions.component.html',
  styleUrl: './conditions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConditionsComponent implements OnInit {
  protected readonly store = inject(ShowcaseStore);

  protected readonly companies = computed<CompanyConditions[]>(() =>
    (this.store.data()?.policies ?? []).map((policy) => ({
      policy,
      perks: this.store
        .tiers()
        .filter(
          (t) =>
            t.company_name === policy.company_name &&
            (t.free_change ||
              (t.cancellation_fee_percent != null && t.cancellation_fee_percent < policy.cancellation_fee_percent) ||
              (t.cancellation_cutoff_hours != null && t.cancellation_cutoff_hours < policy.cancellation_cutoff_hours)),
        ),
    })),
  );

  ngOnInit(): void {
    void this.store.load();
  }

  /** Résumé d'un avantage de niveau, ex. « annulation jusqu'à 1 h avant, sans frais · modification gratuite ». */
  protected tierSummary(t: ShowcaseTier, p: ShowcasePolicy): string {
    const parts: string[] = [];
    const hours = t.cancellation_cutoff_hours ?? p.cancellation_cutoff_hours;
    const fee = t.cancellation_fee_percent ?? p.cancellation_fee_percent;
    if (hours !== p.cancellation_cutoff_hours || fee !== p.cancellation_fee_percent) {
      parts.push(`annulation jusqu’à ${hours} h avant, ${fee === 0 ? 'sans frais' : `frais de ${fee} %`}`);
    }
    if (t.free_change && p.change_enabled) {
      parts.push('modification gratuite');
    }
    return parts.join(' · ');
  }
}
