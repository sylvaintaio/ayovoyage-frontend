import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { Router, provideRouter } from '@angular/router';

import { provideApiConfiguration } from '../../../api/api-configuration';
import { SearchFormComponent } from './search-form.component';

describe('SearchFormComponent', () => {
  it('charge les villes et lance la recherche', async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFormComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(SearchFormComponent);
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    http.expectOne('/api/v1/public/cities').flush([
      { id: '1', name: 'Cotonou', slug: 'cotonou', country_code: 'BJ' },
      { id: '2', name: 'Parakou', slug: 'parakou', country_code: 'BJ' },
    ]);
    await settle(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('#sf-from option').length).toBe(3);

    const selects = el.querySelectorAll('select');
    selects[0].value = 'cotonou';
    selects[0].dispatchEvent(new Event('change'));
    selects[1].value = 'parakou';
    selects[1].dispatchEvent(new Event('change'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(navigate).toHaveBeenCalledWith(['/recherche'], {
      queryParams: expect.objectContaining({ from: 'cotonou', to: 'parakou' }),
    });
  });
});
