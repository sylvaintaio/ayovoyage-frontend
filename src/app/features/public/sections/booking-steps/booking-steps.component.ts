import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Fil de progression de la réservation : sièges → paiement → billet. */
@Component({
  selector: 'bv-booking-steps',
  templateUrl: './booking-steps.component.html',
  styleUrl: './booking-steps.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingStepsComponent {
  /** 1 = sièges, 2 = paiement, 3 = billet. */
  readonly current = input.required<1 | 2 | 3>();
  protected readonly steps = ['Sièges et passagers', 'Paiement', 'Billet'];
}
