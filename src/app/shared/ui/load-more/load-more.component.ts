import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Bas de liste : « Afficher plus » tant qu'il reste des éléments à charger. */
@Component({
  selector: 'bv-load-more',
  templateUrl: './load-more.component.html',
  styleUrl: './load-more.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadMoreComponent {
  readonly hasMore = input(false);
  readonly loading = input(false);
  readonly label = input('Afficher plus');
  readonly more = output<void>();
}
