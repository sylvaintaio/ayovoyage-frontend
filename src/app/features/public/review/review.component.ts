import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { getReviewInvitation, submitReview } from '../../../api/functions';
import { Invitation } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { StarRatingComponent } from '../../../shared/ui/star-rating/star-rating.component';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Avis sur un voyage, depuis le lien personnel reçu après l'arrivée (sans connexion). */
@Component({
  selector: 'bv-review',
  imports: [StateComponent, StarRatingComponent, FormsModule, RouterLink, DatePipe],
  templateUrl: './review.component.html',
  styleUrl: './review.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewComponent {
  private readonly api = inject(Api);

  readonly token = input.required<string>();

  protected readonly invitation = signal<Invitation | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly sendError = signal<string | null>(null);
  protected readonly done = signal(false);

  protected readonly rating = signal<number | null>(null);
  protected readonly punctuality = signal<number | null>(null);
  protected readonly comfort = signal<number | null>(null);
  protected readonly staff = signal<number | null>(null);
  protected readonly cleanliness = signal<number | null>(null);
  protected readonly comment = signal('');
  protected readonly consent = signal(true);

  constructor() {
    effect(() => void this.load(this.token()));
  }

  protected async load(token: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.invitation.set(await this.api.invoke(getReviewInvitation, { token }));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Ce lien n’est pas valable.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async send(): Promise<void> {
    const rating = this.rating();
    if (!rating) {
      this.sendError.set('Choisissez une note globale.');
      return;
    }
    this.sending.set(true);
    this.sendError.set(null);
    try {
      await this.api.invoke(submitReview, {
        token: this.token(),
        body: {
          rating,
          punctuality: this.punctuality() ?? undefined,
          comfort: this.comfort() ?? undefined,
          staff: this.staff() ?? undefined,
          cleanliness: this.cleanliness() ?? undefined,
          comment: this.comment().trim() || undefined,
          publish_consent: this.consent(),
        },
      });
      this.done.set(true);
    } catch (err) {
      this.sendError.set(apiErrorMessage(err));
    } finally {
      this.sending.set(false);
    }
  }
}
