import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Bandeau d'appel à l'action en bas de page. */
@Component({
  selector: 'bv-cta-band',
  imports: [RouterLink],
  templateUrl: './cta-band.component.html',
  styleUrl: './cta-band.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaBandComponent {
  readonly title = input.required<string>();
  readonly text = input('');
  readonly primaryLabel = input('Réserver mon billet');
  readonly primaryLink = input('/');
  readonly secondaryLabel = input('');
  readonly secondaryLink = input('/contact');
}
