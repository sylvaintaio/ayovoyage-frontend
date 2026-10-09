import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Api } from '../../../api/api';
import { listCities } from '../../../api/functions';
import { City } from '../../../api/models';
import { localDate } from '../../../shared/dates';

/** Formulaire de recherche : départ, arrivée, date. */
@Component({
  selector: 'bv-search-form',
  imports: [ReactiveFormsModule],
  templateUrl: './search-form.component.html',
  styleUrl: './search-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFormComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  readonly from = input<string>('');
  readonly to = input<string>('');
  readonly date = input<string>('');
  readonly compact = input(false);

  protected readonly cities = signal<City[]>([]);
  protected readonly today = localDate();
  protected readonly form = inject(FormBuilder).nonNullable.group({
    from: ['', Validators.required],
    to: ['', Validators.required],
    date: [localDate(), Validators.required],
  });

  async ngOnInit(): Promise<void> {
    this.form.patchValue({
      from: this.from() || '',
      to: this.to() || '',
      date: this.date() || localDate(),
    });
    try {
      this.cities.set(await this.api.invoke(listCities));
    } catch {
      this.cities.set([]);
    }
  }

  protected swap(): void {
    const { from, to } = this.form.getRawValue();
    this.form.patchValue({ from: to, to: from });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    void this.router.navigate(['/recherche'], { queryParams: this.form.getRawValue() });
  }
}
