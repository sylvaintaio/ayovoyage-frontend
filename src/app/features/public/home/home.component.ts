import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ABOUT, COMFORT, COMPANY, INFO_BANNER, SERVICES, STEPS } from '../../../content/site-content';
import { ShowcaseStore } from '../../../content/showcase.store';
import { whatsappUrl } from '../agency-utils';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { CardGridComponent } from '../sections/card-grid/card-grid.component';
import { CtaBandComponent } from '../sections/cta-band/cta-band.component';
import { FaqListComponent } from '../sections/faq-list/faq-list.component';
import { HeroComponent } from '../sections/hero/hero.component';
import { LoyaltyTiersComponent } from '../sections/loyalty-tiers/loyalty-tiers.component';
import { OffersComponent } from '../sections/offers/offers.component';
import { PaymentMethodsComponent } from '../sections/payment-methods/payment-methods.component';
import { PopularRoutesComponent } from '../sections/popular-routes/popular-routes.component';
import { ReviewsComponent } from '../sections/reviews/reviews.component';
import { StatsBandComponent } from '../sections/stats-band/stats-band.component';

/** Page d'accueil : la société, ses lignes, ses services, et la réservation. */
@Component({
  selector: 'bv-home',
  imports: [
    RouterLink,
    IconComponent,
    HeroComponent,
    StatsBandComponent,
    PopularRoutesComponent,
    OffersComponent,
    CardGridComponent,
    PaymentMethodsComponent,
    LoyaltyTiersComponent,
    FaqListComponent,
    CtaBandComponent,
    ReviewsComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  protected readonly showcase = inject(ShowcaseStore);
  protected readonly company = COMPANY;
  protected readonly about = ABOUT;
  protected readonly services = SERVICES;
  protected readonly steps = STEPS;
  protected readonly comfort = COMFORT;
  protected readonly infoBanner = INFO_BANNER;
  protected readonly whatsapp = whatsappUrl(COMPANY.whatsapp);
}
