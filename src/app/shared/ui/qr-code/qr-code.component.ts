import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { toDataURL } from 'qrcode';

/** QR code d'un billet, généré localement (aucun service externe). */
@Component({
  selector: 'bv-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrl: './qr-code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeComponent {
  readonly value = input.required<string>();
  readonly size = input(220);
  readonly label = input('QR code du billet');
  protected readonly src = signal<string | null>(null);

  constructor() {
    effect(() => {
      const value = this.value();
      const size = this.size();
      toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
        .then((url) => this.src.set(url))
        .catch(() => this.src.set(null));
    });
  }
}
