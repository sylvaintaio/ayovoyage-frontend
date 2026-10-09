import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { createSeatLayout, getSeatLayout, listSeatCategories, updateSeatLayout } from '../../../api/functions';
import { LayoutCell, SeatCategory } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { Attribute, CellKind, generateCoach, key, renumber, validate } from './layout-grid';

type Tool = CellKind | 'select';

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'select', label: 'Sélection' },
  { id: 'seat', label: 'Siège' },
  { id: 'aisle', label: 'Allée' },
  { id: 'driver', label: 'Chauffeur' },
  { id: 'door', label: 'Porte' },
  { id: 'toilet', label: 'WC' },
  { id: 'empty', label: 'Vide' },
];

const ATTRIBUTES: { id: Attribute; label: string }[] = [
  { id: 'window', label: 'Fenêtre' },
  { id: 'aisle', label: 'Couloir' },
  { id: 'front', label: 'Avant' },
  { id: 'legroom', label: 'Espace jambes' },
  { id: 'family', label: 'Famille' },
  { id: 'accessible', label: 'Accessible' },
];

/** Éditeur visuel du plan de sièges d'un modèle de bus. */
@Component({
  selector: 'bv-layout-editor',
  imports: [FormsModule, RouterLink],
  templateUrl: './layout-editor.component.html',
  styleUrl: './layout-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutEditorComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** « nouveau » ou identifiant du plan. */
  readonly id = input.required<string>();

  protected readonly name = signal('Autocar 2+2');
  protected readonly rows = signal(13);
  protected readonly cols = signal(5);
  protected readonly cells = signal(new Map<string, LayoutCell>());
  protected readonly categories = signal<SeatCategory[]>([]);
  protected readonly inUse = signal(false);
  protected readonly tool = signal<Tool>('seat');
  protected readonly brushCategory = signal('');
  protected readonly selectedKey = signal<string | null>(null);
  protected readonly saving = signal(false);

  // Générateur
  protected readonly genRows = signal(13);
  protected readonly genLeft = signal(2);
  protected readonly genRight = signal(2);

  protected readonly tools = TOOLS;
  protected readonly attributes = ATTRIBUTES;

  protected readonly isNew = computed(() => this.id() === 'nouveau');
  protected readonly readOnly = computed(() => this.inUse());
  protected readonly grid = computed(() =>
    Array.from({ length: this.rows() }, (_, r) => Array.from({ length: this.cols() }, (_, c) => ({ r, c, cell: this.cells().get(key(r, c)) }))),
  );
  protected readonly selected = computed(() => {
    const k = this.selectedKey();
    return k ? (this.cells().get(k) ?? null) : null;
  });
  protected readonly colorById = computed(() => new Map(this.categories().map((c) => [c.id, c.color])));
  protected readonly stats = computed(() => {
    const counts = new Map<string, number>();
    for (const c of this.cells().values()) {
      if (c.kind === 'seat' && c.category_id) {
        counts.set(c.category_id, (counts.get(c.category_id) ?? 0) + 1);
      }
    }
    return this.categories().map((cat) => ({ name: cat.name, color: cat.color, count: counts.get(cat.id) ?? 0 }));
  });
  protected readonly seatCount = computed(() => [...this.cells().values()].filter((c) => c.kind === 'seat').length);
  protected readonly errors = computed(() => validate(this.cells()));

  async ngOnInit(): Promise<void> {
    try {
      const cats = await this.api.invoke(listSeatCategories);
      this.categories.set(cats);
      const standard = cats.find((c) => c.code === 'standard') ?? cats[cats.length - 1];
      this.brushCategory.set(standard?.id ?? '');
      if (this.isNew()) {
        if (standard) {
          this.generate();
        }
        return;
      }
      const layout = await this.api.invoke(getSeatLayout, { id: this.id() });
      this.name.set(layout.name);
      this.rows.set(layout.rows);
      this.cols.set(layout.cols);
      this.inUse.set(layout.in_use);
      this.cells.set(new Map((layout.cells ?? []).map((c) => [key(c.row, c.col), c])));
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }

  protected generate(): void {
    const left = this.genLeft();
    const right = this.genRight();
    this.rows.set(this.genRows());
    this.cols.set(left + 1 + right);
    this.cells.set(generateCoach(this.genRows(), left, right, this.brushCategory()));
    this.selectedKey.set(null);
  }

  protected renumber(): void {
    this.cells.set(renumber(this.cells()));
  }

  protected resize(rows: number, cols: number): void {
    this.rows.set(Math.max(1, Math.min(40, rows)));
    this.cols.set(Math.max(1, Math.min(8, cols)));
    this.cells.update((m) => new Map([...m].filter(([, c]) => c.row < this.rows() && c.col < this.cols())));
  }

  /** Applique l'outil actif à la case cliquée. */
  protected apply(r: number, c: number): void {
    if (this.readOnly()) {
      this.selectedKey.set(key(r, c));
      return;
    }
    const k = key(r, c);
    const t = this.tool();
    if (t === 'select') {
      this.selectedKey.set(k);
      return;
    }
    this.cells.update((m) => {
      const next = new Map(m);
      if (t === 'empty') {
        next.delete(k);
      } else if (t === 'seat') {
        const prev = m.get(k);
        next.set(k, {
          row: r,
          col: c,
          kind: 'seat',
          category_id: this.brushCategory(),
          seat_label: prev?.kind === 'seat' ? prev.seat_label : undefined,
          extra_surcharge: prev?.extra_surcharge ?? 0,
          attributes: prev?.attributes ?? [],
        });
      } else {
        next.set(k, { row: r, col: c, kind: t });
      }
      return next;
    });
    this.selectedKey.set(t === 'seat' ? k : null);
  }

  protected updateSelected(patch: Partial<LayoutCell>): void {
    const k = this.selectedKey();
    const cell = this.selected();
    if (!k || !cell || this.readOnly()) {
      return;
    }
    this.cells.update((m) => new Map(m).set(k, { ...cell, ...patch }));
  }

  protected toggleAttribute(attr: Attribute, on: boolean): void {
    const current = (this.selected()?.attributes ?? []) as Attribute[];
    this.updateSelected({ attributes: on ? [...new Set([...current, attr])] : current.filter((a) => a !== attr) });
  }

  protected hasAttribute(attr: Attribute): boolean {
    return (this.selected()?.attributes ?? []).includes(attr);
  }

  protected cellClass(cell: LayoutCell | undefined): string {
    return cell ? `cell--${cell.kind}` : 'cell--void';
  }

  /** Enregistre, ou duplique le plan s'il est déjà utilisé par des départs. */
  protected async save(asCopy = false): Promise<void> {
    if (this.errors().length) {
      this.toast.error(this.errors()[0]);
      return;
    }
    const body = {
      name: asCopy ? `${this.name()} (v2)` : this.name(),
      rows: this.rows(),
      cols: this.cols(),
      cells: [...this.cells().values()],
    };
    this.saving.set(true);
    try {
      if (this.isNew() || asCopy) {
        const created = await this.api.invoke(createSeatLayout, { body });
        this.toast.success('Plan créé.');
        await this.router.navigate(['/admin/plans', created.id]);
        this.inUse.set(false);
        this.name.set(created.name);
      } else {
        await this.api.invoke(updateSeatLayout, { id: this.id(), body });
        this.toast.success('Plan enregistré.');
      }
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
