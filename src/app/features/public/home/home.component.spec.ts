import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideRouter } from '@angular/router';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('présente la société, ses lignes, ses services et la réservation', async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(HomeComponent);
    await settle(fixture, 5);
    const titles = [...fixture.nativeElement.querySelectorAll('h2')].map((h: HTMLElement) => h.textContent);
    expect(titles.join(' | ')).toContain('Les trajets les plus demandés');
    expect(titles.join(' | ')).toContain('Bien plus qu’un billet de bus');
    expect(titles.join(' | ')).toContain('Votre billet en quatre étapes');
    expect(fixture.nativeElement.querySelector('a[href="/agences"]')).toBeTruthy();
  });
});
