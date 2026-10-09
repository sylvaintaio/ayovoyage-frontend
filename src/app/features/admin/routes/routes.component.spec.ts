import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { RoutesComponent } from './routes.component';

describe('RoutesComponent', () => {
  it('ouvre le formulaire de création', async () => {
    await TestBed.configureTestingModule({
      imports: [RoutesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(RoutesComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/routes').flush([]);
    http.expectOne('/api/v1/admin/agencies').flush([]);
    await settle(fixture);
    fixture.nativeElement.querySelector('.head button').click();
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('#rt-from')).toBeTruthy();
  });
});
