import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SERVICES } from '../../../content/site-content';
import { ServicesComponent } from './services.component';

describe('ServicesComponent', () => {
  it('présente tous les services et la demande de devis', async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ServicesComponent);
    await fixture.whenStable();
    const text: string = fixture.nativeElement.textContent;
    for (const s of SERVICES) {
      expect(text).toContain(s.title);
    }
    expect(text).toContain('Demander un devis');
  });
});
