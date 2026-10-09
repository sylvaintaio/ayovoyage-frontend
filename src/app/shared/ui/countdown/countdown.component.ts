import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';

/** Compte à rebours jusqu'à une échéance (blocage des sièges pendant le paiement). */
@Component({
  selector: 'bv-countdown',
  templateUrl: './countdown.component.html',
  styleUrl: './countdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountdownComponent {
  readonly until = input.required<string>();
  readonly expired = output<void>();

  private readonly now = signal(Date.now());
  protected readonly remaining = computed(() => Math.max(0, new Date(this.until()).getTime() - this.now()));
  protected readonly label = computed(() => {
    const s = Math.floor(this.remaining() / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
  protected readonly urgent = computed(() => this.remaining() < 120_000);

  constructor() {
    let fired = false;
    const timer = setInterval(() => {
      this.now.set(Date.now());
      if (!fired && this.remaining() === 0) {
        fired = true;
        this.expired.emit();
      }
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
