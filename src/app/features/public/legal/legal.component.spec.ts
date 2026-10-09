import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LegalComponent } from './legal.component';

describe('LegalComponent', () => {
  it('signale les informations légales à compléter', async () => {
    await TestBed.configureTestingModule({ imports: [LegalComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(LegalComponent);
    fixture.componentRef.setInput('page', 'mentions');
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Directeur de la publication');
    expect(el.querySelectorAll('.todo').length).toBeGreaterThan(0);
  });

  it('décrit les droits et la suppression du compte', async () => {
    await TestBed.configureTestingModule({ imports: [LegalComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(LegalComponent);
    fixture.componentRef.setInput('page', 'confidentialite');
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Code du numérique');
    expect(text).toContain('supprimer votre compte');
    expect(text).toContain('APDP');
  });
});
