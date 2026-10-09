import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { AnyIcon, IconComponent } from '../icon/icon.component';

/** États de chargement, d'erreur et de liste vide, homogènes dans toute l'application. */
@Component({
  selector: 'bv-state',
  imports: [IconComponent],
  templateUrl: './state.component.html',
  styleUrl: './state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateComponent {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly empty = input(false);
  readonly emptyText = input('Aucun élément à afficher.');
  readonly emptyTitle = input('');
  readonly emptyIcon = input<AnyIcon>('search');
  readonly retry = output<void>();
}
