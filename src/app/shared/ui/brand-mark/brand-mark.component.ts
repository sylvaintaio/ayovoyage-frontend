import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

import { BRAND } from '../../../content/brand';
import { IconComponent } from '../icon/icon.component';

/**
 * Logo : pictogramme de bus sur carré vert à filet jaune (style panneau de
 * quai), suivi du nom. Le nom suit automatiquement BRAND.name.
 */
@Component({
  selector: 'bv-brand-mark',
  imports: [IconComponent],
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.light]': "tone() === 'light'", '[class.compact]': 'compact()' },
})
export class BrandMarkComponent {
  /** light : sur fond sombre (pied de page, connexion). */
  readonly tone = input<'dark' | 'light'>('dark');
  /** Pictogramme seul, sans le nom. */
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly name = BRAND.name;
}
