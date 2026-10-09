import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthShellComponent } from './auth-shell.component';

describe('AuthShellComponent', () => {
  async function render(variant: 'customer' | 'staff') {
    await TestBed.configureTestingModule({ imports: [AuthShellComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(AuthShellComponent);
    fixture.componentRef.setInput('variant', variant);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('montre la carte d’embarquement aux voyageurs', async () => {
    const el = await render('customer');
    expect(el.querySelector('bv-boarding-pass')).toBeTruthy();
    expect(el.textContent).toContain('Retour au site');
  });

  it('présente l’espace professionnel au personnel', async () => {
    const el = await render('staff');
    expect(el.querySelector('bv-boarding-pass')).toBeNull();
    expect(el.textContent).toContain('Espace professionnel');
  });
});
