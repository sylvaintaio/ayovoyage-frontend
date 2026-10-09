import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../auth/auth.store';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  it('n’affiche que les entrées autorisées au rôle', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff',
      staff: { id: '1', company_id: 'c', email: 'c@x', full_name: 'Caissier', phone: '', role: 'cashier' },
    });
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    await fixture.whenStable();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Vente au guichet');
    expect(text).not.toContain('Plans de sièges');
    expect(text).not.toContain('Paramètres');
  });
});
