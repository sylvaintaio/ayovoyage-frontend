import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../auth/auth.store';
import { PublicLayoutComponent } from './public-layout.component';

describe('PublicLayoutComponent', () => {
  async function render() {
    await TestBed.configureTestingModule({
      imports: [PublicLayoutComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
    return TestBed.createComponent(PublicLayoutComponent);
  }

  it('propose la connexion à un visiteur', async () => {
    const fixture = await render();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Se connecter');
  });

  it('affiche « Mon espace » pour un client connecté', async () => {
    const fixture = await render();
    TestBed.inject(AuthStore).me.set({
      type: 'customer',
      customer: { id: '1', phone: '+229', full_name: 'Awa', referral_code: 'X', created_at: '' },
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Mon espace');
    expect(fixture.nativeElement.querySelector('.account__avatar').textContent.trim()).toBe('A');
  });

  it('affiche le menu complet et le contact WhatsApp', async () => {
    const fixture = await render();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    for (const label of ['Voyager', 'Lignes et tarifs', 'Colis', 'Agences', 'Fidélité', 'Aide', 'À propos', 'Contact']) {
      expect(el.querySelector('#menu-principal')!.textContent).toContain(label);
    }
    expect(el.querySelector('a.wa-float')!.getAttribute('href')).toMatch(/^https:\/\/wa\.me\//);
    // « Réserver » toujours visible et mène au formulaire de recherche.
    expect(el.querySelector('a.actions__book')!.getAttribute('href')).toBe('/#reserver');
    // Barre de service : téléphone, billets et signalement.
    expect(el.querySelector('.servicebar a[href^="tel:"]')).toBeTruthy();
    expect(el.querySelector('.servicebar a[href="/compte/signaler"]')).toBeTruthy();
    expect(el.querySelector('.servicebar__label')!.textContent).toMatch(/Service client (ouvert|fermé)/);
  });

  it('ouvre le menu « Voyager » et le referme avec Échap', async () => {
    const fixture = await render();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const voyager = el.querySelector<HTMLButtonElement>('button.nav__toggle')!;
    voyager.click();
    await fixture.whenStable();
    expect(voyager.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('#menu-voyager')!.textContent).toContain('Lignes et tarifs');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(el.querySelectorAll('.nav__group--open').length).toBe(0);
  });
});
