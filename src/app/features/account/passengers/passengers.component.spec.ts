import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { PassengersComponent } from './passengers.component';

describe('PassengersComponent', () => {
  it('ajoute un proche à la liste', async () => {
    await TestBed.configureTestingModule({
      imports: [PassengersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(PassengersComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/v1/me/passengers').flush([]);
    await settle(fixture);

    const el: HTMLElement = fixture.nativeElement;
    const name = el.querySelector('#pa-name') as HTMLInputElement;
    name.value = 'Koffi Dossou';
    name.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/me/passengers');
    expect(req.request.body.full_name).toBe('Koffi Dossou');
    req.flush({ id: 'p1', full_name: 'Koffi Dossou', phone: '', relationship: '' });
    await settle(fixture);
    expect(el.textContent).toContain('Koffi Dossou');
  });
});
