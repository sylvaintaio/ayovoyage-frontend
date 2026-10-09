import { TestBed } from '@angular/core/testing';

import { SeatMap } from '../../../api/models';
import { SeatMapComponent } from './seat-map.component';

const map: SeatMap = {
  rows: 2,
  cols: 3,
  cells: [
    { id: 'drv', row: 0, col: 0, kind: 'driver', state: 'none' },
    { id: 'a1', row: 1, col: 0, kind: 'seat', seat_label: '1A', category_id: 'vip', price: 12500, state: 'available' },
    { id: 'ai', row: 1, col: 1, kind: 'aisle', state: 'none' },
    { id: 'b1', row: 1, col: 2, kind: 'seat', seat_label: '1B', category_id: 'vip', price: 12500, state: 'sold' },
  ],
};

describe('SeatMapComponent', () => {
  async function setup(mode: 'select' | 'view' = 'select') {
    await TestBed.configureTestingModule({ imports: [SeatMapComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SeatMapComponent);
    fixture.componentRef.setInput('seatMap', map);
    fixture.componentRef.setInput('mode', mode);
    await fixture.whenStable();
    return fixture;
  }

  it('reproduit la grille avec allée et poste chauffeur', async () => {
    const fixture = await setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.row').length).toBe(2);
    expect(el.querySelectorAll('button.seat').length).toBe(2);
    expect(el.textContent).toContain('Chauffeur');
  });

  it('sélectionne un siège libre et ignore un siège vendu', async () => {
    const fixture = await setup();
    const [free, sold] = fixture.nativeElement.querySelectorAll('button.seat') as NodeListOf<HTMLButtonElement>;
    expect(sold.disabled).toBe(true);
    free.click();
    expect(fixture.componentInstance.selected()).toEqual(['a1']);
    free.click();
    expect(fixture.componentInstance.selected()).toEqual([]);
  });

  it('respecte le nombre maximal de sièges', async () => {
    const fixture = await setup();
    fixture.componentRef.setInput('maxSelection', 0);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button.seat').click();
    expect(fixture.componentInstance.selected()).toEqual([]);
  });

  it('est en lecture seule en mode « view »', async () => {
    const fixture = await setup('view');
    expect((fixture.nativeElement.querySelector('button.seat') as HTMLButtonElement).disabled).toBe(true);
  });
});
