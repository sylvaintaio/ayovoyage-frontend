import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { StopPointsComponent } from './stop-points.component';

describe('StopPointsComponent', () => {
  it('groupe les points par ville et signale les agences', async () => {
    await TestBed.configureTestingModule({
      imports: [StopPointsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(StopPointsComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/stop-points').flush([
      { id: '1', city_id: 'c1', city_name: 'Dassa-Zoumè', name: 'Carrefour Dassa', address: '', is_active: true, in_use: true },
      { id: '2', city_id: 'c2', city_name: 'Bohicon', name: 'Bohicon — Gare routière', agency_id: 'a', address: '', is_active: true, in_use: true },
    ]);
    http.expectOne('/api/v1/public/cities').flush([]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.city').length).toBe(2);
    expect(el.textContent).toContain('Agence');
  });
});
