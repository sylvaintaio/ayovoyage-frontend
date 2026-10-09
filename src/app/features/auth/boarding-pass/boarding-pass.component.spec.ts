import { TestBed } from '@angular/core/testing';

import { BoardingPassComponent } from './boarding-pass.component';

describe('BoardingPassComponent', () => {
  it('est décoratif (masqué des lecteurs d’écran) et affiche le nom de la compagnie', async () => {
    await TestBed.configureTestingModule({ imports: [BoardingPassComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BoardingPassComponent);
    fixture.componentRef.setInput('companyName', 'TRANS EXPRESS');
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toContain('TRANS EXPRESS');
    expect(el.querySelectorAll('.qr span').length).toBe(81);
  });
});
