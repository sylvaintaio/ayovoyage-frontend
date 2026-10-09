import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listReviews, moderateReview } from '../../../api/functions';
import { Review, ReviewList } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { StateComponent } from '../../../shared/ui/state/state.component';

type Filter = 'all' | 'pending' | 'negative';

/** Avis des voyageurs : indicateurs, modération (publier, masquer) et réponse publique. */
@Component({
  selector: 'bv-admin-reviews',
  imports: [StateComponent, FormsModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReviewsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly filter = signal<Filter>('all');
  protected readonly data = signal<ReviewList | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  /** Avis en cours d'édition (réponse ou motif de masquage). */
  protected readonly editing = signal<{ id: string; mode: 'reply' | 'hide'; text: string } | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly stars = [1, 2, 3, 4, 5];

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const f = this.filter();
      this.data.set(
        await this.api.invoke(listReviews, {
          status: f === 'pending' ? 'pending' : undefined,
          max_rating: f === 'negative' ? 2 : undefined,
          limit: 100,
        }),
      );
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected setFilter(f: Filter): void {
    this.filter.set(f);
    void this.load();
  }

  protected edit(r: Review, mode: 'reply' | 'hide'): void {
    this.editing.set({ id: r.id, mode, text: mode === 'reply' ? (r.reply ?? '') : '' });
  }

  protected async apply(r: Review, status: 'published' | 'hidden' | 'pending', extra: { reply?: string; reason?: string } = {}): Promise<void> {
    this.busy.set(r.id);
    try {
      await this.api.invoke(moderateReview, {
        id: r.id,
        body: { status, reply: extra.reply ?? r.reply ?? '', hidden_reason: extra.reason },
      });
      this.editing.set(null);
      this.toast.success(status === 'published' ? 'Avis publié.' : status === 'hidden' ? 'Avis masqué.' : 'Réponse enregistrée.');
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }

  protected saveEdit(r: Review): void {
    const e = this.editing();
    if (!e) {
      return;
    }
    if (e.mode === 'hide') {
      void this.apply(r, 'hidden', { reason: e.text.trim() });
    } else {
      void this.apply(r, r.status, { reply: e.text.trim() });
    }
  }
}
