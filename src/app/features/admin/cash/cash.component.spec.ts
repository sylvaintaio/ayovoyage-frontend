import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { CashComponent } from './cash.component';

describe('CashComponent', () => {
  it('calcule l’écart et exige un commentaire avant la clôture', async () => {
    await TestBed.configureTestingModule({
      imports: [CashComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff', staff: { id: 's', company_id: 'c', agency_id: 'a1', email: '', full_name: 'Caissier', phone: '', role: 'cashier' },
    });
    const fixture = TestBed.createComponent(CashComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url === '/api/v1/admin/cash/summary').flush({
      agency_id: 'a1', business_date: '2026-10-08', cash_in: 52000, sales_count: 6, cash_out: 2000, refunds_count: 1,
      expected_cash: 50000, by_cashier: [{ staff_id: 's', full_name: 'Caissier', sales_count: 6, amount: 52000 }],
    });
    http.expectOne((r) => r.url === '/api/v1/admin/cash/closures').flush([]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const text = () => (el.textContent ?? '').replace(/\s/g, ' ');
    expect(text()).toContain('50 000 F CFA');
    expect(el.querySelector('select')).toBeNull(); // le caissier ne choisit pas l'agence

    const counted = el.querySelector('#ca-counted') as HTMLInputElement;
    counted.value = '49500';
    counted.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(text()).toContain('Manquant : 500 F CFA');
    expect(text()).toContain('obligatoire en cas d’écart');
  });
});
