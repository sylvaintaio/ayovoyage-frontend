import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuthStore } from '../../../core/auth/auth.store';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  it('pré-remplit le formulaire avec le profil', async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'customer',
      customer: { id: '1', phone: '+2290197000001', full_name: 'Awa Dossou', referral_code: 'ABC', created_at: '' },
    });
    const fixture = TestBed.createComponent(ProfileComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#pr-name') as HTMLInputElement).value).toBe('Awa Dossou');
    expect(fixture.nativeElement.textContent).toContain('ABC');
  });
});
