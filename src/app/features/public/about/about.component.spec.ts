import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ABOUT } from '../../../content/site-content';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  it('raconte l’histoire, la mission et les valeurs', async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(AboutComponent);
    await fixture.whenStable();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain(ABOUT.mission);
    for (const v of ABOUT.values) {
      expect(text).toContain(v.title);
    }
  });
});
