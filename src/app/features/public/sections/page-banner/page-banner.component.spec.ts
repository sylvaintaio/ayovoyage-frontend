import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PageBannerComponent } from './page-banner.component';

describe('PageBannerComponent', () => {
  it('affiche le titre et le fil d’Ariane', async () => {
    await TestBed.configureTestingModule({ imports: [PageBannerComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(PageBannerComponent);
    fixture.componentRef.setInput('title', 'À propos');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('À propos');
    expect(fixture.nativeElement.querySelector('.crumbs a').getAttribute('href')).toBe('/');
  });
});
