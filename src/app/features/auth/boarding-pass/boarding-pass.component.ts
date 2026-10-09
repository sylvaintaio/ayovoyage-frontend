import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BRAND } from '../../../content/brand';

/**
 * Carte d'embarquement décorative du panneau de connexion.
 * Le motif du QR est fixe (purement illustratif, non scannable).
 */
@Component({
  selector: 'bv-boarding-pass',
  templateUrl: './boarding-pass.component.html',
  styleUrl: './boarding-pass.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class BoardingPassComponent {
  readonly companyName = input<string>(BRAND.name);

  /** Motif 9×9 déterministe imitant un QR code. */
  protected readonly qr = Array.from({ length: 81 }, (_, i) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const finder = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
    return finder ? (r % 2 === 0 || c % 2 === 0 ? 1 : 0) : (r * 7 + c * 13 + r * c) % 3 === 0 ? 1 : 0;
  });
}
