import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { AdminAgenciesComponent } from './agencies.component';

describe('AdminAgenciesComponent', () => {
  it('ne laisse un chef d’agence modifier que son agence', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAgenciesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'staff', staff: { id: 's', company_id: 'c', agency_id: 'a1', email: '', full_name: 'Chef', phone: '', role: 'agency_manager' },
    });
    const fixture = TestBed.createComponent(AdminAgenciesComponent);
    fixture.detectChanges();
    const base = { company_id: 'c', city_id: 'x', city_name: 'Cotonou', address: '', landmark: '', phone: '', whatsapp: '',
      email: '', opening_hours: [], services: [], instructions: '', photos: [], is_active: true };
    TestBed.inject(HttpTestingController).expectOne('/api/v1/admin/agencies').flush([
      { ...base, id: 'a1', name: 'Jonquet', slug: 'jonquet' },
      { ...base, id: 'a2', name: 'Calavi', slug: 'calavi' },
    ]);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('a[href^="/admin/agences/"]').length).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('Nouvelle agence');
  });
});
