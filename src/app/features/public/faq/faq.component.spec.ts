import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FAQ } from '../../../content/site-content';
import { FaqComponent } from './faq.component';

describe('FaqComponent', () => {
  it('affiche toutes les questions', async () => {
    await TestBed.configureTestingModule({ imports: [FaqComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(FaqComponent);
    await fixture.whenStable();
    const total = FAQ.reduce((n, g) => n + g.items.length, 0);
    expect(fixture.nativeElement.querySelectorAll('details').length).toBe(total);
  });
});
