import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  signal,
  output,
  viewChildren,
} from '@angular/core';

/**
 * Saisie d'un code à usage unique, une case par chiffre :
 * passage automatique à la case suivante, retour arrière, flèches,
 * collage du code complet et remplissage automatique par SMS (one-time-code).
 */
@Component({
  selector: 'bv-otp-input',
  templateUrl: './otp-input.component.html',
  styleUrl: './otp-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpInputComponent {
  readonly length = input(6);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly label = input('Code de vérification');
  readonly value = model('');
  /** Émis quand toutes les cases sont remplies. */
  readonly completed = output<string>();

  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');
  /** Une valeur par case (les cases vides gardent leur position). */
  private readonly digits = signal<string[]>([]);
  protected readonly slots = computed(() => Array.from({ length: this.length() }, (_, i) => this.digits()[i] ?? ''));

  constructor() {
    // Réinitialisation par le parent (ex. nouveau code demandé).
    effect(() => {
      if (this.value() === '' && this.digits().some((d) => d)) {
        this.digits.set([]);
      }
    });
    // Premier champ actif à l'affichage.
    effect(() => {
      const first = this.boxes()[0];
      if (first && !this.value()) {
        queueMicrotask(() => first.nativeElement.focus());
      }
    });
  }

  protected onInput(index: number, event: Event): void {
    const el = event.target as HTMLInputElement;
    const digits = el.value.replace(/\D/g, '');
    if (digits.length > 1) {
      // Remplissage automatique (SMS) ou saisie rapide : on répartit les chiffres.
      this.fill(index, digits);
      return;
    }
    this.setDigit(index, digits);
    el.value = digits;
    if (digits) {
      this.focus(index + 1);
    }
  }

  protected onKeydown(index: number, event: KeyboardEvent): void {
    const el = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !el.value) {
      event.preventDefault();
      this.setDigit(index - 1, '');
      this.focus(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.focus(index + 1);
    }
  }

  protected onPaste(index: number, event: ClipboardEvent): void {
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (digits) {
      event.preventDefault();
      this.fill(index, digits);
    }
  }

  protected select(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  private fill(from: number, digits: string): void {
    const chars = this.slots();
    for (let i = 0; i < digits.length && from + i < this.length(); i++) {
      chars[from + i] = digits[i];
    }
    this.commit(chars);
    this.focus(Math.min(from + digits.length, this.length() - 1));
  }

  private setDigit(index: number, digit: string): void {
    if (index < 0 || index >= this.length()) {
      return;
    }
    const chars = this.slots();
    chars[index] = digit;
    this.commit(chars);
  }

  private commit(chars: string[]): void {
    this.digits.set(chars);
    const code = chars.join('');
    this.value.set(code);
    if (chars.every((c) => c !== '') && code.length === this.length()) {
      this.completed.emit(code);
    }
  }

  private focus(index: number): void {
    this.boxes()[Math.max(0, Math.min(index, this.length() - 1))]?.nativeElement.focus();
  }
}
