import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { COMPANY } from '../../../../content/site-content';
import { ShowcaseStore } from '../../../../content/showcase.store';
import { localDate } from '../../../../shared/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { SearchFormComponent } from '../../search-form/search-form.component';

/** Premier écran : accroche, tableau des prochains départs (données réelles) et recherche. */
@Component({
  selector: 'bv-hero',
  imports: [SearchFormComponent, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent {
  protected readonly company = COMPANY;
  private readonly showcase = inject(ShowcaseStore);
  protected readonly departures = computed(() => this.showcase.data()?.next_departures ?? []);
  protected readonly now = signal(new Date());

  constructor() {
    void this.showcase.load();
  }

  protected isToday(iso: string): boolean {
    return localDate(0, new Date(iso)) === localDate(0);
  }
}
