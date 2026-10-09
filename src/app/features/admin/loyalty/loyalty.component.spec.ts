import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { AdminLoyaltyComponent } from './loyalty.component';

describe('AdminLoyaltyComponent', () => {
  it('charge les niveaux et l’engagement financier', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLoyaltyComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff', staff: { id: 's', company_id: 'c', email: '', full_name: 'Admin', phone: '', role: 'company_admin' },
    });
    const fixture = TestBed.createComponent(AdminLoyaltyComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/loyalty').flush({
      program: { is_enabled: true, points_per_100: 1, point_value: 5, max_redeem_percent: 50, points_validity_months: 12, signup_bonus_points: 50 },
      tiers: [{ code: 'bronze', name: 'Bronze', min_trips: 0, discount_percent: 0, perks: [] },
        { code: 'gold', name: 'Or', min_trips: 15, discount_percent: 10, perks: ['Bagage gratuit'] }],
    });
    http.expectOne('/api/v1/admin/loyalty/stats').flush({ members: 12, active_members: 8, points_outstanding: 3000, liability: 15000 });
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.tier').length).toBe(2);
    expect(el.textContent?.replace(/\s/g, '')).toContain('15000FCFA');
  });
});
