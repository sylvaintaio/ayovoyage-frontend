import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';

import { Invoice } from '../../../api/models';
import { InvoiceListComponent, invoicePdfUrl } from './invoice-list.component';

const base: Invoice = {
  id: 'i1', number: 'FAC-2026-000001', kind: 'invoice', issued_at: '2026-10-08T09:00:00Z', currency: 'XOF',
  customer_name: 'Awa', emecef_status: 'none', operator_name: 'Vente en ligne', payment_method: 'Mobile Money',
  reference: 'BV1', total_amount: 7500, email_status: 'none',
};

const providers = [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')];

describe('InvoiceListComponent', () => {
  it('construit les adresses des PDF', () => {
    expect(invoicePdfUrl('x', 'admin')).toBe('/api/v1/admin/invoices/x/pdf');
    expect(invoicePdfUrl('x', 'admin', 'ticket')).toBe('/api/v1/admin/invoices/x/pdf?format=ticket');
    expect(invoicePdfUrl('x', 'client')).toBe('/api/v1/me/invoices/x/pdf');
  });

  it('affiche factures et avoirs, avec l’impression ticket au back-office', async () => {
    await TestBed.configureTestingModule({ imports: [InvoiceListComponent], providers }).compileComponents();
    const fixture = TestBed.createComponent(InvoiceListComponent);
    fixture.componentRef.setInput('invoices', [
      base,
      { ...base, id: 'i2', number: 'AV-2026-000001', kind: 'credit_note', total_amount: 6750, emecef_status: 'certified',
        email_status: 'failed', email_to: 'awa@exemple.bj' },
    ]);
    fixture.componentRef.setInput('scope', 'admin');
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const text = (el.textContent ?? '').replace(/\s/g, ' ');
    expect(text).toContain('Facture FAC-2026-000001');
    expect(text).toContain('Avoir AV-2026-000001');
    expect(text).toContain('normalisée DGI');
    expect(text).toContain('Échec de l’envoi à awa@exemple.bj');
    expect(el.querySelectorAll('a[href$="format=ticket"]').length).toBe(2);
  });

  it('envoie la facture au client par e-mail et affiche l’état à jour', async () => {
    await TestBed.configureTestingModule({ imports: [InvoiceListComponent], providers }).compileComponents();
    const fixture = TestBed.createComponent(InvoiceListComponent);
    fixture.componentRef.setInput('invoices', [base]);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('button')!.click();
    const req = TestBed.inject(HttpTestingController).expectOne('/api/v1/me/invoices/i1/email');
    expect(req.request.method).toBe('POST');
    req.flush({ ...base, email_status: 'sent', email_to: 'awa@exemple.bj', emailed_at: '2026-10-08T21:00:00Z' });
    await settle(fixture);
    expect(el.textContent).toContain('Envoyée par e-mail à awa@exemple.bj');
  });
});
