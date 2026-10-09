import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';

import { Api } from '../../../../api/api';
import { listPublicReviews } from '../../../../api/functions';
import { PublicReviews } from '../../../../api/models';

/** Avis publiés des voyageurs (note moyenne et derniers avis), masqués s'il n'y en a pas encore. */
@Component({
  selector: 'bv-reviews',
  imports: [DecimalPipe],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent implements OnInit {
  private readonly api = inject(Api);
  readonly limit = input(6);
  readonly agencyId = input<string | undefined>();

  protected readonly data = signal<PublicReviews | null>(null);
  protected readonly stars = [1, 2, 3, 4, 5];

  async ngOnInit(): Promise<void> {
    try {
      this.data.set(await this.api.invoke(listPublicReviews, { limit: this.limit(), agency_id: this.agencyId() }));
    } catch {
      this.data.set(null); // section facultative
    }
  }
}
