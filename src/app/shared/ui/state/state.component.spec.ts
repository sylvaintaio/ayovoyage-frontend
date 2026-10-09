import { TestBed } from '@angular/core/testing';

import { StateComponent } from './state.component';

describe('StateComponent', () => {
  it('affiche l’erreur et émet « retry »', async () => {
    await TestBed.configureTestingModule({ imports: [StateComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StateComponent);
    fixture.componentRef.setInput('error', 'Réseau indisponible');
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Réseau indisponible');
    fixture.nativeElement.querySelector('button').click();
    expect(retry).toHaveBeenCalled();
  });
});
