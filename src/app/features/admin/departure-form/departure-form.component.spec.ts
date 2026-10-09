import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { DepartureFormComponent } from './departure-form.component';

describe('DepartureFormComponent', () => {
  it('propose uniquement les bus en service', async () => {
    await TestBed.configureTestingModule({
      imports: [DepartureFormComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api'),
        { provide: DialogRef, useValue: { close: vi.fn() } },
        { provide: DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DepartureFormComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/routes').flush([]);
    const bus = { layout_id: 'l', amenities: [], internal_code: '', model: 'Yutong', notes: '', seat_count: 48 };
    http.expectOne('/api/v1/admin/buses').flush([
      { ...bus, id: 'b1', plate_number: 'AB 1', status: 'active' },
      { ...bus, id: 'b2', plate_number: 'CD 2', status: 'maintenance' },
    ]);
    await settle(fixture);
    const options = fixture.nativeElement.querySelectorAll('#df-bus option');
    expect(options.length).toBe(2); // option vide + bus actif
  });

  it('programme des départs réguliers après un aperçu', async () => {
    const close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [DepartureFormComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api'),
        { provide: DialogRef, useValue: { close } },
        { provide: DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DepartureFormComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/routes').flush([{ id: 'r1', name: 'Cotonou → Parakou', base_price: 7500, is_active: true }]);
    http.expectOne('/api/v1/admin/buses').flush([
      { id: 'b1', plate_number: 'AB 1', status: 'active', layout_id: 'l', amenities: [], internal_code: '', model: 'Yutong', notes: '', seat_count: 48 },
    ]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const pick = (id: string, v: string) => {
      const sel = el.querySelector(id) as HTMLSelectElement;
      sel.value = v;
      sel.dispatchEvent(new Event('change'));
    };
    pick('#df-route', 'r1');
    pick('#df-bus', 'b1');
    (el.querySelectorAll('.segmented button')[1] as HTMLButtonElement).click();
    await settle(fixture);
    // Samedi et dimanche décochés : du lundi au vendredi.
    const days = el.querySelectorAll<HTMLButtonElement>('.day');
    days[5].click();
    days[6].click();
    await settle(fixture);
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const preview = http.expectOne('/api/v1/admin/departures/recurring');
    expect(preview.request.body).toMatchObject({ route_id: 'r1', bus_id: 'b1', weekdays: [1, 2, 3, 4, 5], dry_run: true });
    const dep = { id: '', route_id: 'r1', route_name: '', bus_id: 'b1', plate_number: '', arrival_eta: '', base_price: 7500, status: 'scheduled', notes: '' };
    preview.flush({
      dry_run: true,
      created: [{ ...dep, departure_at: '2026-11-02T06:00:00Z' }, { ...dep, departure_at: '2026-11-03T06:00:00Z' }],
      skipped: [{ departure_at: '2026-11-04T06:00:00Z', reason: 'Bus déjà affecté sur ce créneau' }],
    });
    await settle(fixture);
    expect(el.textContent).toContain('2 départs à créer');
    expect(el.textContent).toContain('Bus déjà affecté');

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const create = http.expectOne('/api/v1/admin/departures/recurring');
    expect(create.request.body.dry_run).toBe(false);
    create.flush({ dry_run: false, created: [dep, dep], skipped: [] });
    await settle(fixture);
    expect(close).toHaveBeenCalledWith({ recurring: 2 });
  });
});
