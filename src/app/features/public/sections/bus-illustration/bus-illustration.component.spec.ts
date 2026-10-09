import { TestBed } from '@angular/core/testing';

import { BusIllustrationComponent } from './bus-illustration.component';

describe('BusIllustrationComponent', () => {
  it('affiche le nom de la compagnie sur le bus et une description accessible', async () => {
    await TestBed.configureTestingModule({ imports: [BusIllustrationComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BusIllustrationComponent);
    fixture.componentRef.setInput('companyName', 'TRANS EXPRESS');
    await fixture.whenStable();
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.textContent).toContain('TRANS EXPRESS');
  });
});
