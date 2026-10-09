import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

const LABELS = ['', 'Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent'];

/** Note de 1 à 5 étoiles, accessible (groupe de boutons radio, utilisable au clavier). */
@Component({
  selector: 'bv-star-rating',
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRatingComponent {
  readonly label = input.required<string>();
  readonly name = input.required<string>();
  readonly size = input<'md' | 'lg'>('md');
  readonly value = model<number | null>(null);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly labels = LABELS;
}
