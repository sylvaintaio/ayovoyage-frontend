import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { LayoutsComponent } from './layouts.component';

describe('LayoutsComponent', () => {
  it('liste les plans', async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(LayoutsComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/admin/seat-layouts')
      .flush([{ id: 'l1', name: 'Autocar 2+2', rows: 13, cols: 5, seat_count: 48, in_use: true }]);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Autocar 2+2');
  });
});
