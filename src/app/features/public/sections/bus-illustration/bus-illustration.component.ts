import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BRAND } from '../../../../content/brand';

/**
 * Illustration vectorielle (aucune image à télécharger : idéale en réseau lent).
 * À remplacer par de vraies photos de la flotte dès qu'elles sont disponibles.
 */
@Component({
  selector: 'bv-bus-illustration',
  templateUrl: './bus-illustration.component.html',
  styleUrl: './bus-illustration.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusIllustrationComponent {
  readonly companyName = input<string>(BRAND.name);
}
