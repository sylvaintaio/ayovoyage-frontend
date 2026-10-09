import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface TimelineItem {
  label: string;
  at: string;
  place?: string;
  note?: string;
  author?: string;
  tone?: 'done' | 'current' | 'alert';
}

/** Historique vertical (suivi de colis, dossier de réclamation). Le plus récent en haut. */
@Component({
  selector: 'bv-timeline',
  imports: [DatePipe],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent {
  readonly items = input.required<TimelineItem[]>();
}
