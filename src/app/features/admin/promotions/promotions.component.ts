import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../api/api';
import {
  getPromoCodeStats,
  listPricingRules,
  listPromoCodes,
  listRoutes,
  listSeatCategories,
} from '../../../api/functions';
import { PricingRule, PromoCode, PromoStats, Route, SeatCategory } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { Pager } from '../../../shared/pager';
import { LoadMoreComponent } from '../../../shared/ui/load-more/load-more.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import {
  PromoDialogComponent,
  PromoDialogData,
  PromoDialogResult,
} from './promo-dialog/promo-dialog.component';
import { RuleDialogComponent, RuleDialogData } from './rule-dialog/rule-dialog.component';
import { API_URL } from '../../../core/http/api-url';

/** Promotions : codes promo (uniques ou en série) et tarifs « réservez tôt ». */
@Component({
  selector: 'bv-promotions',
  imports: [StateComponent, LoadMoreComponent, FormsModule, DatePipe, MoneyPipe],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionsComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  protected readonly canEdit = inject(AuthStore).hasRole('company_admin');

  protected readonly tab = signal<'codes' | 'rules'>('codes');
  protected readonly q = signal('');
  protected readonly codes = signal<PromoCode[]>([]);
  protected readonly rules = signal<PricingRule[]>([]);
  protected readonly pager = new Pager(this.codes, (page) =>
    this.api.invoke(listPromoCodes, { q: this.q().trim() || undefined, ...page }),
  );
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly stats = signal<Record<string, PromoStats>>({});
  protected readonly lastBatch = signal<{ id: string; count: number } | null>(null);

  private routes: Route[] = [];
  private categories: SeatCategory[] = [];

  async ngOnInit(): Promise<void> {
    this.api.invoke(listRoutes).then(
      (r) => (this.routes = r.filter((x) => x.is_active)),
      () => undefined,
    );
    this.api.invoke(listSeatCategories).then(
      (c) => (this.categories = c),
      () => undefined,
    );
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [, rules] = await Promise.all([this.pager.first(), this.api.invoke(listPricingRules)]);
      this.rules.set(rules);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async openPromo(mode: PromoDialogData['mode'], promo?: PromoCode): Promise<void> {
    const res = await this.dialog.open<PromoDialogResult, PromoDialogData>(PromoDialogComponent, {
      mode,
      promo,
      routes: this.routes,
      categories: this.categories,
    });
    if (!res) {
      return;
    }
    if ('codes' in res) {
      this.lastBatch.set({ id: res.batchId, count: res.codes.length });
      this.toast.success(`${res.codes.length} codes générés.`);
    } else {
      this.toast.success(`Code ${res.promo.code} enregistré.`);
    }
    await this.load();
  }

  protected async openRule(rule?: PricingRule): Promise<void> {
    const saved = await this.dialog.open<PricingRule, RuleDialogData>(RuleDialogComponent, {
      rule,
      routes: this.routes,
    });
    if (saved) {
      this.toast.success('Tarif enregistré.');
      await this.load();
    }
  }

  protected async toggleStats(p: PromoCode): Promise<void> {
    if (this.stats()[p.id]) {
      this.stats.update((m) => {
        const next = { ...m };
        delete next[p.id];
        return next;
      });
      return;
    }
    try {
      const s = await this.api.invoke(getPromoCodeStats, { id: p.id });
      this.stats.update((m) => ({ ...m, [p.id]: s }));
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  protected exportUrl(batchId?: string): string {
    return `${API_URL}/v1/admin/promo-codes/export` + (batchId ? `?batch_id=${batchId}` : '');
  }

  protected expired(p: PromoCode): boolean {
    return !!p.valid_to && new Date(p.valid_to).getTime() < Date.now();
  }

  protected async more(): Promise<void> {
    try {
      await this.pager.next();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
