import { TestBed } from '@angular/core/testing';

import { BRAND } from '../../../content/brand';
import { BrandMarkComponent } from './brand-mark.component';

describe('BrandMarkComponent', () => {
  it('affiche le pictogramme de bus et le nom de la marque', async () => {
    await TestBed.configureTestingModule({ imports: [BrandMarkComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BrandMarkComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.mark bv-icon')).toBeTruthy();
    expect(el.querySelector('.name')!.textContent).toContain(BRAND.name);
  });

  it('peut n’afficher que le pictogramme', async () => {
    await TestBed.configureTestingModule({ imports: [BrandMarkComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BrandMarkComponent);
    fixture.componentRef.setInput('compact', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.name')).toBeNull();
  });
});
