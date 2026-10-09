import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { trackParcel } from '../../../api/functions';
import { PublicTracking } from '../../../api/models';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { TimelineComponent, TimelineItem } from '../../../shared/ui/timeline/timeline.component';

/** Grandes étapes affichées dans la barre de progression. */
const STAGES = [
  { label: 'Déposé', statuses: ['accepted', 'assigned', 'loaded'] },
  { label: 'En route', statuses: ['in_transit', 'arrived'] },
  { label: 'À retirer', statuses: ['ready'] },
  { label: 'Remis', statuses: ['delivered'] },
];

/** Suivi public d'un colis, sans données personnelles. Le signalement passe par l'espace client. */
@Component({
  selector: 'bv-parcel-tracking',
  imports: [RouterLink, DatePipe, MoneyPipe, IconComponent, TimelineComponent],
  templateUrl: './parcel-tracking.component.html',
  styleUrl: './parcel-tracking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelTrackingComponent {
  private readonly api = inject(Api);

  readonly numero = input.required<string>();

  protected readonly parcel = signal<PublicTracking | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly stages = STAGES;

  protected readonly stage = computed(() => {
    const s = this.parcel()?.status ?? '';
    return STAGES.findIndex((st) => st.statuses.includes(s));
  });
  protected readonly steps = computed<TimelineItem[]>(() =>
    [...(this.parcel()?.steps ?? [])].reverse().map((e, i) => ({ label: e.label, at: e.created_at, place: e.place, tone: i === 0 ? 'current' : 'done' })),
  );

  constructor() {
    effect(() => void this.load(this.numero()));
  }

  protected async load(numero: string): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    try {
      this.parcel.set(await this.api.invoke(trackParcel, { tracking: numero }));
    } catch {
      this.parcel.set(null);
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
