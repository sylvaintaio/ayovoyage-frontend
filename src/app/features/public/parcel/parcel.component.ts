import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PARCEL } from '../../../content/site-content';
import { CardGridComponent } from '../sections/card-grid/card-grid.component';
import { CtaBandComponent } from '../sections/cta-band/cta-band.component';
import { FaqListComponent } from '../sections/faq-list/faq-list.component';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';

@Component({
  selector: 'bv-parcel',
  imports: [RouterLink, FormsModule, PageBannerComponent, CardGridComponent, FaqListComponent, CtaBandComponent],
  templateUrl: './parcel.component.html',
  styleUrl: './parcel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelComponent {
  protected readonly parcel = PARCEL;
  protected readonly number = signal('');
  private readonly router = inject(Router);

  protected track(): void {
    const n = this.number().trim().split('/').pop()!.toUpperCase().replace(/\s/g, '');
    if (n) {
      void this.router.navigate(['/colis/suivi', n]);
    }
  }
}
