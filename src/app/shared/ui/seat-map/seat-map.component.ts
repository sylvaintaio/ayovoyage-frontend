import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { CategoryPrice, SeatCell, SeatMap } from '../../../api/models';
import { MoneyPipe, formatMoney } from '../../pipes/money.pipe';

/**
 * Plan de sièges d'un bus, fidèle à la configuration réelle (grille).
 * - mode « select » : le voyageur ou le caissier choisit des sièges libres ;
 * - mode « staff »  : chaque siège est cliquable (bloquer, voir le passager) ;
 * - mode « view »   : lecture seule.
 */
@Component({
  selector: 'bv-seat-map',
  imports: [MoneyPipe],
  templateUrl: './seat-map.component.html',
  styleUrl: './seat-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeatMapComponent {
  readonly seatMap = input.required<SeatMap>();
  readonly categories = input<CategoryPrice[]>([]);
  readonly mode = input<'select' | 'staff' | 'view'>('select');
  readonly maxSelection = input(10);
  readonly selected = model<string[]>([]);
  readonly seatClick = output<SeatCell>();

  protected readonly categoryById = computed(() => new Map(this.categories().map((c) => [c.id, c])));

  /** Grille complète (les cases absentes sont vides). */
  protected readonly grid = computed(() => {
    const map = this.seatMap();
    const byPos = new Map((map.cells).map((c) => [`${c.row}:${c.col}`, c]));
    return Array.from({ length: map.rows }, (_, r) =>
      Array.from({ length: map.cols }, (_, c) => byPos.get(`${r}:${c}`) ?? null),
    );
  });

  protected readonly cols = computed(() => this.seatMap().cols);

  protected isSelected(cell: SeatCell): boolean {
    return this.selected().includes(cell.id);
  }

  protected isClickable(cell: SeatCell): boolean {
    if (cell.kind !== 'seat') {
      return false;
    }
    switch (this.mode()) {
      case 'select':
        return cell.state === 'available' || this.isSelected(cell);
      case 'staff':
        return true;
      default:
        return false;
    }
  }

  protected color(cell: SeatCell): string {
    return (cell.category_id && this.categoryById().get(cell.category_id)?.color) || 'var(--bv-line-strong)';
  }

  protected ariaLabel(cell: SeatCell): string {
    const cat = cell.category_id ? this.categoryById().get(cell.category_id)?.name : '';
    const states: Record<string, string> = {
      available: 'libre',
      held: 'en cours de réservation',
      sold: 'vendu',
      boarded: 'passager embarqué',
      blocked: 'indisponible',
    };
    const who = this.mode() === 'staff' && cell.passenger_name ? `, ${cell.passenger_name}` : '';
    return `Siège ${cell.seat_label}, ${cat ?? ''}, ${formatMoney(cell.price)}, ${states[cell.state] ?? cell.state}${who}`;
  }

  protected toggle(cell: SeatCell): void {
    if (!this.isClickable(cell)) {
      return;
    }
    this.seatClick.emit(cell);
    if (this.mode() !== 'select') {
      return;
    }
    const current = this.selected();
    if (current.includes(cell.id)) {
      this.selected.set(current.filter((id) => id !== cell.id));
    } else if (current.length < this.maxSelection()) {
      this.selected.set([...current, cell.id]);
    }
  }
}
