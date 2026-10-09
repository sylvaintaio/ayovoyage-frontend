import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { FAQ } from '../../../../content/site-content';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

/** Questions fréquentes en accordéon (balises natives details/summary : accessibles sans JavaScript). */
@Component({
  selector: 'bv-faq-list',
  imports: [IconComponent],
  templateUrl: './faq-list.component.html',
  styleUrl: './faq-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqListComponent {
  /** 0 = toutes les questions, groupées par thème. Sinon, les N premières. */
  readonly limit = input(0);
  readonly categories = input<string[]>([]);

  protected readonly groups = computed(() => {
    const wanted = this.categories();
    const groups = FAQ.filter((g) => wanted.length === 0 || wanted.includes(g.category));
    if (this.limit() === 0) {
      return groups;
    }
    return [{ category: '', items: groups.flatMap((g) => g.items).slice(0, this.limit()) }];
  });
}
