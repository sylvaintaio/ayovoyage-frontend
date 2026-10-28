import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { BusesComponent } from './buses.component';

describe('BusesComponent', () => {
  it('invite à créer un plan de sièges avant le premier bus', async () => {
    await TestBed.configureTestingModule({
      imports: [BusesComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('/api'),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BusesComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/buses').flush([]);
    http.expectOne('/api/v1/admin/seat-layouts').flush([]);
    http.expectOne('/api/v1/admin/agencies').flush([]);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('plan de sièges');
    expect(
      (fixture.nativeElement.querySelector('.head button') as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
