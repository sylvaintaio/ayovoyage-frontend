import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { StaffComponent } from './staff.component';

describe('StaffComponent', () => {
  it('affiche le rôle en français et signale un compte verrouillé', async () => {
    await TestBed.configureTestingModule({
      imports: [StaffComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff', staff: { id: 's', company_id: 'c', email: '', full_name: 'Admin', phone: '', role: 'company_admin' },
    });
    const fixture = TestBed.createComponent(StaffComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/staff').flush([
      { id: 'u1', email: 'c@x', full_name: 'Caissier', phone: '', role: 'cashier', is_active: true, created_at: '', locked_until: '2026-10-08T10:00:00Z' },
    ]);
    http.expectOne('/api/v1/admin/agencies').flush([]);
    await settle(fixture);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Caissier');
    expect(text).toContain('Verrouillé');
  });
});
