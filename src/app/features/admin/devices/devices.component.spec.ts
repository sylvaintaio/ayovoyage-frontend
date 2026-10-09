import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { DevicesComponent } from './devices.component';

describe('DevicesComponent', () => {
  it('ne propose que le personnel de terrain', async () => {
    await TestBed.configureTestingModule({
      imports: [DevicesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(DevicesComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/devices').flush([]);
    const base = { email: '', phone: '', is_active: true, created_at: '' };
    http.expectOne('/api/v1/admin/staff').flush([
      { ...base, id: 'a', full_name: 'Agent', role: 'boarding_agent' },
      { ...base, id: 'c', full_name: 'Caissier', role: 'cashier' },
    ]);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('#dv-staff option').length).toBe(2);
  });
});
