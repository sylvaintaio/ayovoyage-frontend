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
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('/api'),
        { provide: DialogRef, useValue: { close: vi.fn() } },
        { provide: DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DepartureFormComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/routes').flush([]);
    const bus = {
      layout_id: 'l',
      amenities: [],
      internal_code: '',
      model: 'Yutong',
      notes: '',
      seat_count: 48,
    };
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
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('/api'),
        { provide: DialogRef, useValue: { close } },
        { provide: DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DepartureFormComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/admin/routes')
      .flush([
        { id: 'r1', name: 'Cotonou → Parakou', base_price: 7500, is_active: true, stops: [] },
      ]);
    http.expectOne('/api/v1/admin/buses').flush([
      {
        id: 'b1',
        plate_number: 'AB 1',
        status: 'active',
        layout_id: 'l',
        amenities: [],
        internal_code: '',
        model: 'Yutong',
        notes: '',
        seat_count: 48,
      },
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
    const preview = http.expectOne('/api/v1/admin/departure-schedules');
    expect(preview.request.body).toMatchObject({
      route_id: 'r1',
      bus_id: 'b1',
      weekdays: [1, 2, 3, 4, 5],
      dry_run: true,
    });
    expect(preview.request.body.ends_on).toBeUndefined(); // sans fin par défaut
    preview.flush({
      dry_run: true,
      created: 43,
      removed: 0,
      kept: [],
      upcoming: ['2026-11-02T06:00:00Z', '2026-11-03T06:00:00Z'],
      issues: [{ date: '2026-11-04', reason: 'Bus AB 1 déjà affecté sur ce créneau' }],
    });
    await settle(fixture);
    expect(el.textContent).toContain('43 départs à créer');
    expect(el.textContent).toContain('Bus AB 1 déjà affecté');

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const create = http.expectOne('/api/v1/admin/departure-schedules');
    expect(create.request.body.dry_run).toBe(false);
    const change = { dry_run: false, created: 43, removed: 0, kept: [], upcoming: [], issues: [] };
    create.flush(change);
    await settle(fixture);
    expect(close).toHaveBeenCalledWith({ schedule: change });
  });

  it('modifie un horaire : départs gardés listés avant d’enregistrer', async () => {
    const schedule = {
      id: 's1',
      route_id: 'r1',
      route_name: 'Cotonou → Parakou',
      bus_id: 'b1',
      plate_number: 'AB 1',
      time: '07:00',
      weekdays: [],
      base_price: 0,
      crew: [],
      notes: '',
      starts_on: '2026-10-01',
      active: true,
      issues: [],
      upcoming_count: 60,
    };
    await TestBed.configureTestingModule({
      imports: [DepartureFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('/api'),
        { provide: DialogRef, useValue: { close: vi.fn() } },
        { provide: DIALOG_DATA, useValue: { schedule } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DepartureFormComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/admin/routes')
      .flush([
        { id: 'r1', name: 'Cotonou → Parakou', base_price: 7500, is_active: true, stops: [] },
      ]);
    http.expectOne('/api/v1/admin/buses').flush([
      {
        id: 'b1',
        plate_number: 'AB 1',
        status: 'active',
        layout_id: 'l',
        amenities: [],
        internal_code: '',
        model: 'Yutong',
        notes: '',
        seat_count: 48,
      },
    ]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h2')!.textContent).toContain('Modifier l’horaire');
    expect(el.querySelector('.segmented')).toBeNull();
    expect((el.querySelector('#df-route') as HTMLSelectElement).disabled).toBe(true);
    const time = el.querySelector('#df-time') as HTMLInputElement;
    time.value = '07:30';
    time.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne('/api/v1/admin/departure-schedules/s1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ time: '07:30', weekdays: [], dry_run: true });
    expect(req.request.body.route_id).toBeUndefined();
    req.flush({
      dry_run: true,
      created: 58,
      removed: 58,
      upcoming: [],
      issues: [],
      kept: [
        {
          id: 'd9',
          departure_at: '2026-11-05T06:00:00Z',
          reason: 'Déjà réservé (voyageurs ou colis)',
        },
      ],
    });
    await settle(fixture);
    expect(el.textContent).toContain('58 départs à venir recréés');
    expect(el.textContent).toContain('1 départ gardé tel quel');
    expect(el.textContent).toContain('Déjà réservé');
  });
});
