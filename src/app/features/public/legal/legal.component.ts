import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LEGAL, isPlaceholder } from '../../../content/legal-content';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';

/** Pages légales : mentions légales et politique de confidentialité. */
@Component({
  selector: 'bv-legal',
  imports: [PageBannerComponent, RouterLink, DatePipe],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalComponent {
  /** Fourni par la route (data.page). */
  readonly page = input<'mentions' | 'confidentialite'>('mentions');

  protected readonly legal = LEGAL;
  protected readonly todo = isPlaceholder;
}
