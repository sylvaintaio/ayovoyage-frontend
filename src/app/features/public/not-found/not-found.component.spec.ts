import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  it('propose de revenir à la recherche', async () => {
    await TestBed.configureTestingModule({ imports: [NotFoundComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(NotFoundComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a[href="/"]')).toBeTruthy();
  });
});
