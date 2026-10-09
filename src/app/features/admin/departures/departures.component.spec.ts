import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { DeparturesComponent } from './departures.component';

describe('DeparturesComponent', () => {
  it('masque la programmation pour un agent d’embarquement', async () => {
    await TestBed.configureTestingModule({
      imports: [DeparturesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(DeparturesComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/v1/admin/departures').flush([]);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('Programmer un départ');
    expect(fixture.nativeElement.textContent).toContain('Aucun départ');
  });
});
