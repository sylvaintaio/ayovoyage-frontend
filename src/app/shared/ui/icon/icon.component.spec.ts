import { TestBed } from '@angular/core/testing';

import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  it('dessine l’icône demandée, masquée des lecteurs d’écran', async () => {
    await TestBed.configureTestingModule({ imports: [IconComponent] }).compileComponents();
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'bus');
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('svg path, svg circle').length).toBeGreaterThan(3);
  });
});
