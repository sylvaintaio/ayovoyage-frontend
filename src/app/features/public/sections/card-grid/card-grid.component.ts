import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContentCard } from '../../../../content/site-content';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

export type CardItem = ContentCard & { link?: string; linkLabel?: string };

/**
 * Présentation d'une série d'éléments, sous plusieurs formes pour varier le rythme des pages :
 * - cards    : cartes avec icône ;
 * - list     : liste éditoriale numérotée (01, 02…), sans icônes ;
 * - timeline : étapes reliées par une ligne ;
 * - bento    : mosaïque, le premier élément mis en avant ;
 * - inline   : icône et texte sur une ligne, pour les fonds sombres.
 */
@Component({
  selector: 'bv-card-grid',
  imports: [IconComponent, RouterLink],
  templateUrl: './card-grid.component.html',
  styleUrl: './card-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardGridComponent {
  readonly items = input.required<CardItem[]>();
  readonly columns = input<2 | 3 | 4>(3);
  readonly numbered = input(false);
  readonly variant = input<'cards' | 'list' | 'timeline' | 'bento' | 'inline'>('cards');
  protected pad(i: number): string {
    return String(i + 1).padStart(2, '0');
  }
  readonly tone = input<'primary' | 'accent'>('primary');
}
