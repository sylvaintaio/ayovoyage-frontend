import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { CategoriesComponent } from './categories.component';

describe('CategoriesComponent', () => {
  it('envoie les avantages sous forme de liste', async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(CategoriesComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/v1/admin/seat-categories').flush([]);
    await settle(fixture);
    fixture.nativeElement.querySelector('.head button').click();
    await settle(fixture);

    const set = (id: string, value: string) => {
      const el = fixture.nativeElement.querySelector(id) as HTMLInputElement;
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };
    set('#ca-code', 'vip');
    set('#ca-name', 'VIP');
    set('#ca-perks', 'Eau offerte\nLounge');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.body.perks).toEqual(['Eau offerte', 'Lounge']);
    req.flush({});
  });
});
