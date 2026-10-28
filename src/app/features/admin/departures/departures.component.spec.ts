import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { DeparturesComponent, groupByDay } from './departures.component';

describe('DeparturesComponent', () => {
  it('masque la programmation pour un agent d’embarquement', async () => {
    await TestBed.configureTestingModule({
      imports: [DeparturesComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('/api'),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DeparturesComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/v1/admin/departures')
      .flush([]);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('Programmer');
    expect(fixture.nativeElement.textContent).toContain('Aucun départ');
  });
});

describe('groupByDay', () => {
  const dep = (id: string, at: string) => ({ id, departure_at: at }) as never;

  it('regroupe par jour (heure du Bénin), dans l’ordre, avec « Aujourd’hui » et « Demain »', () => {
    const days = groupByDay(
      [
        dep('c', '2026-10-15T05:30:00Z'),
        dep('a', '2026-10-14T05:00:00Z'),
        dep('b', '2026-10-14T23:30:00Z'),
        dep('d', '2026-10-17T06:00:00Z'),
      ],
      '2026-10-14',
    );
    expect(days.map((d) => d.date)).toEqual(['2026-10-14', '2026-10-15', '2026-10-17']);
    // 23 h 30 UTC le 14 = 0 h 30 le 15 au Bénin.
    expect(days[1].departures.map((d) => d.id)).toEqual(['b', 'c']);
    expect(days[0].label).toMatch(/^Aujourd'hui · mercredi 14 octobre/);
    expect(days[1].label).toMatch(/^Demain · /);
    expect(days[2].label).toBe('Samedi 17 octobre');
  });
});
