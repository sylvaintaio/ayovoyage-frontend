import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { DialogService } from '../../../core/dialog/dialog.service';
import { weekdaysLabel } from '../departure-form/departure-form.component';
import { changeSummary, SchedulesComponent } from './schedules.component';

const schedule = {
  id: 's1',
  route_id: 'r1',
  route_name: 'Cotonou → Parakou',
  bus_id: 'b1',
  plate_number: 'AB 1234 RB',
  time: '07:00',
  weekdays: [1, 3, 5],
  base_price: 0,
  crew: [],
  notes: '',
  starts_on: '2026-10-01',
  active: true,
  issues: [{ date: '2026-11-04', reason: 'Bus AB 1234 RB déjà affecté sur ce créneau' }],
  upcoming_count: 25,
  next_departure_at: '2026-10-30T06:00:00Z',
};

describe('SchedulesComponent', () => {
  it('libellés des jours et résumé des changements', () => {
    expect(weekdaysLabel([])).toBe('Tous les jours');
    expect(weekdaysLabel([1, 2, 3, 4, 5])).toBe('Du lundi au vendredi');
    expect(weekdaysLabel([6, 7])).toBe('Le week-end');
    expect(weekdaysLabel([1, 3, 5])).toBe('Lun, mer, ven');
    expect(
      changeSummary({
        dry_run: false,
        created: 3,
        removed: 2,
        upcoming: [],
        issues: [],
        kept: [{ id: 'd', departure_at: '', reason: '' }],
      }),
    ).toBe(
      '3 départ(s) créé(s), 2 retiré(s), 1 gardé(s) tel(s) quel(s) (déjà réservés ou modifiés à la main).',
    );
  });

  it('liste les horaires et suspend après confirmation', async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [SchedulesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('/api'),
        provideRouter([]),
        { provide: DialogService, useValue: { confirm, open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SchedulesComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/departure-schedules').flush([schedule]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Lun, mer, ven');
    expect(el.textContent).toContain('25 à venir');
    expect(el.textContent).toContain('1 date non créée');

    const pause = [...el.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Suspendre',
    )!;
    pause.click();
    await settle(fixture);
    expect(confirm).toHaveBeenCalled();
    const req = http.expectOne('/api/v1/admin/departure-schedules/s1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({
      bus_id: 'b1',
      time: '07:00',
      weekdays: [1, 3, 5],
      active: false,
    });
    req.flush({ dry_run: false, created: 0, removed: 25, kept: [], upcoming: [], issues: [] });
    await settle(fixture);
    http
      .expectOne('/api/v1/admin/departure-schedules')
      .flush([{ ...schedule, active: false, upcoming_count: 0 }]);
    await settle(fixture);
    expect(el.textContent).toContain('Suspendu');
    expect(el.textContent).toContain('Reprendre');
  });
});
