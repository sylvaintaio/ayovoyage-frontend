import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { InvoicesComponent } from './invoices.component';

describe('InvoicesComponent', () => {
  it('affiche les totaux de la période et l’export pour la finance', async () => {
    await TestBed.configureTestingModule({
      imports: [InvoicesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api'), provideRouter([])],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff', staff: { id: 's', company_id: 'c', email: '', full_name: 'Finance', phone: '', role: 'finance' },
    });
    const fixture = TestBed.createComponent(InvoicesComponent);
    fixture.detectChanges();
    const req = TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/v1/admin/invoices');
    expect(req.request.params.get('from')).toMatch(/-01$/);
    req.flush({
      invoiced: 30000, credited: 6750, invoices_count: 3, credit_notes_count: 1,
      invoices: [{
        id: 'i1', number: 'FAC-2026-000003', kind: 'invoice', issued_at: '2026-10-08T21:00:00Z', currency: 'XOF',
        customer_name: 'Koffi', customer_company: 'Société Test SARL', customer_tax_id: '3209876543210',
        emecef_status: 'none', operator_name: 'Caissier', payment_method: 'Espèces', reference: 'BVNT52RXSR',
        booking_id: 'b1', total_amount: 7500,
      }],
    });
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const text = (el.textContent ?? '').replace(/\s/g, ' ');
    expect(text).toContain('23 250 F CFA');
    expect(text).toContain('Société Test SARL');
    expect(el.querySelector('a[href^="/api/v1/admin/invoices/export"]')).not.toBeNull();
  });
});
