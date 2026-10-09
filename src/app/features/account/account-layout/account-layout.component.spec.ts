import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { AccountLayoutComponent } from './account-layout.component';

describe('AccountLayoutComponent', () => {
  it('affiche le profil (initiales, téléphone) et les onglets', async () => {
    await TestBed.configureTestingModule({
      imports: [AccountLayoutComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
    TestBed.inject(AuthStore).me.set({
      type: 'customer',
      customer: { id: '1', phone: '+2290197000001', full_name: 'Mariam Adjovi', referral_code: 'X', created_at: '' },
    });
    const fixture = TestBed.createComponent(AccountLayoutComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.who__avatar')!.textContent!.trim()).toBe('MA');
    expect(el.textContent).toContain('+229 01 97 00 00 01');
    expect(el.querySelectorAll('.tabs a').length).toBe(10);
  });
});
