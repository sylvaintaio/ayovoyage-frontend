import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { BRAND, brandSlug } from '../../../../content/brand';
import { ToastService } from '../../../../core/notify/toast.service';

/** Codes de secours : affichés une seule fois, à copier, télécharger ou imprimer. */
@Component({
  selector: 'bv-recovery-codes',
  templateUrl: './recovery-codes.component.html',
  styleUrl: './recovery-codes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryCodesComponent {
  private readonly toast = inject(ToastService);

  readonly codes = input.required<string[]>();
  readonly account = input('');
  /** Libellé du bouton final. */
  readonly doneLabel = input('Continuer');
  readonly done = output<void>();

  protected readonly saved = signal(false);

  private text(): string {
    return [
      `${BRAND.name} — codes de secours de la double authentification`,
      this.account() ? `Compte : ${this.account()}` : '',
      `Générés le ${new Date().toLocaleString('fr-FR')}`,
      '',
      'Chaque code ne peut servir qu’une seule fois, si vous n’avez plus accès à votre application.',
      '',
      ...this.codes(),
    ]
      .filter((l, i) => l !== '' || i > 2)
      .join('\n');
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
      this.toast.success('Codes copiés.');
    } catch {
      this.toast.error('Copie impossible : téléchargez le fichier.');
    }
  }

  protected download(): void {
    const url = URL.createObjectURL(new Blob([this.text()], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brandSlug()}-codes-de-secours.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected print(): void {
    window.print();
  }
}
