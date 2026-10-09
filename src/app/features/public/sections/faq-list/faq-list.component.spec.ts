import { TestBed } from '@angular/core/testing';

import { FaqListComponent } from './faq-list.component';

describe('FaqListComponent', () => {
  it('limite le nombre de questions sur la page d’accueil', async () => {
    await TestBed.configureTestingModule({ imports: [FaqListComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FaqListComponent);
    fixture.componentRef.setInput('limit', 3);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('details').length).toBe(3);
    expect(fixture.nativeElement.querySelector('h3')).toBeNull();
  });

  it('regroupe toutes les questions par thème', async () => {
    await TestBed.configureTestingModule({ imports: [FaqListComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FaqListComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('h3').length).toBeGreaterThan(2);
  });
});
