import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { RouteEditorComponent, offsetsFromTimes, timeAt } from './route-editor.component';

describe('RouteEditorComponent', () => {
  it('convertit les heures de passage en décalages, y compris après minuit', () => {
    expect(offsetsFromTimes(['07:00', '07:40', '09:30', '14:00'])).toEqual([0, 40, 150, 420]);
    expect(offsetsFromTimes(['22:00', '23:30', '01:15', '05:00'])).toEqual([0, 90, 195, 420]);
    expect(timeAt('22:00', 195)).toBe('01:15');
  });

  it('nouvelle ligne : 2 arrêts, montée au premier, descente au dernier, grille sur demande', async () => {
    await TestBed.configureTestingModule({
      imports: [RouteEditorComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(RouteEditorComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/admin/stop-points').flush([
      { id: 'p1', city_id: 'c1', city_name: 'Cotonou', name: 'Jonquet', agency_id: 'a1', address: '', is_active: true, in_use: false },
      { id: 'p2', city_id: 'c2', city_name: 'Dassa-Zoumè', name: 'Carrefour Dassa', address: '', is_active: true, in_use: false },
    ]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.stops tbody tr').length).toBe(2);
    expect(el.textContent).toContain('Le premier arrêt doit être une agence');
    (el.querySelector('input[value="grid"]') as HTMLInputElement).click();
    await settle(fixture);
    expect(el.textContent).toContain('Ajoutez des arrêts avec montée et descente');
  });
});
