import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CardGridComponent } from './card-grid.component';

describe('CardGridComponent', () => {
  it('numérote les étapes', async () => {
    await TestBed.configureTestingModule({ imports: [CardGridComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(CardGridComponent);
    fixture.componentRef.setInput('items', [
      { icon: 'search', title: 'Recherchez', text: '' },
      { icon: 'card', title: 'Payez', text: '' },
    ]);
    fixture.componentRef.setInput('numbered', true);
    await fixture.whenStable();
    const steps = [...fixture.nativeElement.querySelectorAll('.step')].map((s: HTMLElement) => s.textContent);
    expect(steps).toEqual(['1', '2']);
  });
});

describe('CardGridComponent (variantes)', () => {
  it('numérote la liste éditoriale sur deux chiffres', async () => {
    await TestBed.configureTestingModule({ imports: [CardGridComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(CardGridComponent);
    fixture.componentRef.setInput('items', [{ icon: 'shield', title: 'Sécurité', text: '' }]);
    fixture.componentRef.setInput('variant', 'list');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.v-list__index').textContent).toBe('01');
    expect(fixture.nativeElement.querySelector('bv-icon')).toBeNull();
  });
});
