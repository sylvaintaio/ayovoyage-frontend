import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listSeatLayouts } from '../../../api/functions';
import { SeatLayout } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { StateComponent } from '../../../shared/ui/state/state.component';

@Component({
  selector: 'bv-layouts',
  imports: [StateComponent, RouterLink],
  templateUrl: './layouts.component.html',
  styleUrl: './layouts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutsComponent implements OnInit {
  private readonly api = inject(Api);
  protected readonly layouts = signal<SeatLayout[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.layouts.set(await this.api.invoke(listSeatLayouts));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
