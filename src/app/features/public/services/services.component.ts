import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ABOUT, COMFORT, SERVICES } from '../../../content/site-content';
import { CardGridComponent } from '../sections/card-grid/card-grid.component';
import { CtaBandComponent } from '../sections/cta-band/cta-band.component';
import { OffersComponent } from '../sections/offers/offers.component';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';
import { PaymentMethodsComponent } from '../sections/payment-methods/payment-methods.component';

@Component({
  selector: 'bv-services',
  imports: [RouterLink, PageBannerComponent, CardGridComponent, OffersComponent, PaymentMethodsComponent, CtaBandComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesComponent {
  protected readonly services = SERVICES;
  protected readonly comfort = COMFORT;
  protected readonly commitments = ABOUT.commitments;
}
