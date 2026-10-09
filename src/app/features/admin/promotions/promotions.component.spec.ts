import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { PromotionsComponent } from './promotions.component';

describe('PromotionsComponent', () => {
  it('liste les codes, affiche leurs résultats et les tarifs « réservez tôt »', async () => {
    await TestBed.configureTestingModule({
      imports: [PromotionsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff', staff: { id: 's', company_id: 'c', email: '', full_name: 'Admin', phone: '', role: 'company_admin' },
    });
    const fixture = TestBed.createComponent(PromotionsComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/routes').flush([]);
    http.expectOne('/api/v1/admin/seat-categories').flush([]);
    http.expectOne((r) => r.url === '/api/v1/admin/promo-codes').flush([
      { id: 'p1', code: 'TABASKI26', label: 'Tabaski', kind: 'percent', value: 10, min_amount: 0, per_customer_limit: 1,
        first_trip_only: true, channels: ['web'], route_ids: [], category_codes: [], is_active: true, created_at: '',
        uses: 4, usage_limit: 100, discount_total: 4000, description: '−10 %' },
    ]);
    http.expectOne('/api/v1/admin/pricing-rules').flush([
      { id: 'r1', label: 'Réservez tôt', min_days_before: 7, percent: 15, seat_quota: 10, excluded_dates: [], is_active: true },
    ]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const text = () => (el.textContent ?? '').replace(/\s+/g, ' ');
    expect(text()).toContain('TABASKI26');
    expect(text()).toContain('4 / 100');
    expect(text()).toContain('Premier voyage');

    el.querySelector<HTMLButtonElement>('tbody .btn--ghost')!.click();
    http.expectOne('/api/v1/admin/promo-codes/p1/stats').flush({ uses: 4, pending: 1, customers: 3, discount_total: 4000, revenue: 36000 });
    await settle(fixture);
    expect(el.querySelector('.stats')!.textContent).toContain('3');

    el.querySelectorAll<HTMLAnchorElement>('.tabs a')[1].click();
    await settle(fixture);
    expect(text()).toContain('−15 %');
    expect(text()).toContain('Au moins 7 jour(s) avant');
  });
});
