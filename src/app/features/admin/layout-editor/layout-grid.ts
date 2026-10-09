import { LayoutCell } from '../../../api/models';

export type CellKind = LayoutCell['kind'];
export type Attribute = 'window' | 'aisle' | 'family' | 'accessible' | 'front' | 'legroom';

export const key = (row: number, col: number): string => `${row}:${col}`;

/**
 * Génère un plan d'autocar classique : poste chauffeur et porte au premier rang,
 * puis des rangées de sièges de part et d'autre d'une allée centrale.
 */
export function generateCoach(rows: number, leftSeats: number, rightSeats: number, categoryId: string): Map<string, LayoutCell> {
  const cols = leftSeats + 1 + rightSeats;
  const aisle = leftSeats;
  const cells = new Map<string, LayoutCell>();
  cells.set(key(0, 0), { row: 0, col: 0, kind: 'driver' });
  cells.set(key(0, cols - 1), { row: 0, col: cols - 1, kind: 'door' });
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.set(key(r, c), c === aisle ? { row: r, col: c, kind: 'aisle' } : { row: r, col: c, kind: 'seat', category_id: categoryId });
    }
  }
  return renumber(cells);
}

/**
 * Numérote les sièges rangée par rangée (1A, 1B, 1C…) et déduit les attributs
 * fenêtre / couloir de leur position. Les attributs choisis à la main sont conservés.
 */
export function renumber(cells: Map<string, LayoutCell>): Map<string, LayoutCell> {
  const out = new Map(cells);
  const byRow = new Map<number, LayoutCell[]>();
  for (const c of cells.values()) {
    if (c.kind === 'seat') {
      byRow.set(c.row, [...(byRow.get(c.row) ?? []), c]);
    }
  }
  const aisleCols = new Set([...cells.values()].filter((c) => c.kind === 'aisle').map((c) => c.col));
  let rowNumber = 0;
  for (const row of [...byRow.keys()].sort((a, b) => a - b)) {
    rowNumber++;
    const seats = byRow.get(row)!.sort((a, b) => a.col - b.col);
    seats.forEach((s, i) => {
      const manual = (s.attributes ?? []).filter((a) => a !== 'window' && a !== 'aisle');
      const auto: Attribute[] = [];
      if (i === 0 || i === seats.length - 1) {
        auto.push('window');
      }
      if (aisleCols.has(s.col - 1) || aisleCols.has(s.col + 1)) {
        auto.push('aisle');
      }
      out.set(key(s.row, s.col), {
        ...s,
        seat_label: `${rowNumber}${String.fromCharCode(65 + i)}`,
        attributes: [...auto, ...manual] as Attribute[],
      });
    });
  }
  return out;
}

/** Erreurs bloquantes avant enregistrement. */
export function validate(cells: Map<string, LayoutCell>): string[] {
  const errors: string[] = [];
  const labels = new Set<string>();
  let seats = 0;
  for (const c of cells.values()) {
    if (c.kind !== 'seat') {
      continue;
    }
    seats++;
    if (!c.seat_label) {
      errors.push(`Siège sans numéro en rangée ${c.row + 1}`);
    } else if (labels.has(c.seat_label)) {
      errors.push(`Numéro en double : ${c.seat_label}`);
    } else {
      labels.add(c.seat_label);
    }
    if (!c.category_id) {
      errors.push(`Siège ${c.seat_label ?? ''} sans catégorie`);
    }
  }
  if (seats === 0) {
    errors.push('Le plan doit contenir au moins un siège.');
  }
  return errors;
}
