import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CtaBandComponent } from './cta-band.component';

describe('CtaBandComponent', () => {
  it('affiche le titre et le bouton secondaire seulement s’il est fourni', async () => {
    await TestBed.configureTestingModule({ imports: [CtaBandComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(CtaBandComponent);
    fixture.componentRef.setInput('title', 'Prêt à partir ?');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Prêt à partir ?');
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(1);
  });
});
