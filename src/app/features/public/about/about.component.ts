import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ABOUT, COMFORT, COMPANY } from '../../../content/site-content';
import { BusIllustrationComponent } from '../sections/bus-illustration/bus-illustration.component';
import { CardGridComponent } from '../sections/card-grid/card-grid.component';
import { CtaBandComponent } from '../sections/cta-band/cta-band.component';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';
import { StatsBandComponent } from '../sections/stats-band/stats-band.component';

@Component({
  selector: 'bv-about',
  imports: [PageBannerComponent, StatsBandComponent, CardGridComponent, BusIllustrationComponent, CtaBandComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  protected readonly about = ABOUT;
  protected readonly company = COMPANY;
  protected readonly comfort = COMFORT;
}
