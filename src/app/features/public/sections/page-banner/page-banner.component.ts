import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** En-tête des pages intérieures : fil d'Ariane, titre, introduction. */
@Component({
  selector: 'bv-page-banner',
  imports: [RouterLink],
  templateUrl: './page-banner.component.html',
  styleUrl: './page-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageBannerComponent {
  readonly title = input.required<string>();
  readonly lead = input('');
}
