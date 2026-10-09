import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CtaBandComponent } from '../sections/cta-band/cta-band.component';
import { FaqListComponent } from '../sections/faq-list/faq-list.component';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';

@Component({
  selector: 'bv-faq',
  imports: [PageBannerComponent, FaqListComponent, CtaBandComponent],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent {}
