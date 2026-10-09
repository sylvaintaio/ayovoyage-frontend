import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AgencyFormComponent } from './agency-form.component';

describe('AgencyFormComponent', () => {
  it('propose les 7 jours d’horaires et les 4 services', async () => {
    await TestBed.configureTestingModule({
      imports: [AgencyFormComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(AgencyFormComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/cities').flush([]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.hours__row').length).toBe(7);
    expect(el.querySelectorAll('.services input[type="checkbox"]').length).toBe(4);
  });
});
