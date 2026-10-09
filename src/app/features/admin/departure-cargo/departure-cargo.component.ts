import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { listDepartureBaggage, listDepartureParcels, scanBaggage, scanParcel } from '../../../api/functions';
import { Baggage, ManifestParcel } from '../../../api/models';
import { apiErrorMessage } from '../../../core/http/api-error';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

type Mode = 'load' | 'unload' | 'deliver';

/** Soute d'un départ : colis et bagages attendus, scan au chargement / déchargement. */
@Component({
  selector: 'bv-departure-cargo',
  imports: [FormsModule, RouterLink, IconComponent, StatusBadgeComponent],
  templateUrl: './departure-cargo.component.html',
  styleUrl: './departure-cargo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartureCargoComponent {
  private readonly api = inject(Api);

  readonly departureId = input.required<string>();
  readonly departureStatus = input<string>('scheduled');

  protected readonly parcels = signal<ManifestParcel[]>([]);
  protected readonly baggage = signal<Baggage[]>([]);
  protected readonly code = signal('');
  protected readonly mode = signal<Mode>('load');
  protected readonly feedback = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly busy = signal(false);

  protected readonly parcelsLoaded = computed(() => this.parcels().filter((p) => p.status !== 'assigned').length);
  protected readonly bagsLoaded = computed(() => this.baggage().filter((b) => b.status !== 'checked').length);
  protected readonly bagsWeight = computed(() => this.baggage().reduce((s, b) => s + b.weight_kg, 0));

  constructor() {
    effect(() => {
      this.mode.set(this.departureStatus() === 'arrived' || this.departureStatus() === 'departed' ? 'unload' : 'load');
      void this.load(this.departureId());
    });
  }

  protected async load(id: string): Promise<void> {
    const [p, b] = await Promise.all([
      this.api.invoke(listDepartureParcels, { id }).catch(() => [] as ManifestParcel[]),
      this.api.invoke(listDepartureBaggage, { id }).catch(() => [] as Baggage[]),
    ]);
    this.parcels.set(p);
    this.baggage.set(b);
  }

  /** Un même champ pour les colis (CL…, lien du QR) et les bagages (BG-…). */
  protected async scan(): Promise<void> {
    const raw = this.code().trim();
    if (!raw || this.busy()) {
      return;
    }
    this.busy.set(true);
    const tag = raw.split('/').pop()!.split('?')[0].toUpperCase();
    try {
      if (tag.startsWith('BG-')) {
        const b = await this.api.invoke(scanBaggage, {
          body: { tag, action: this.mode(), departure_id: this.mode() === 'load' ? this.departureId() : undefined },
        });
        this.feedback.set({ ok: true, text: `Bagage ${b.tag_number} (${b.passenger_name}, siège ${b.seat_label}) : ${this.verb()}` });
      } else if (this.mode() === 'load') {
        const p = await this.api.invoke(scanParcel, { body: { tracking: tag, action: 'load', departure_id: this.departureId() } });
        this.feedback.set({ ok: true, text: `Colis ${p.tracking_number} pour ${p.destination_agency_name} : chargé` });
      } else {
        const p = await this.api.invoke(scanParcel, { body: { tracking: tag, action: 'receive' } });
        this.feedback.set({ ok: true, text: `Colis ${p.tracking_number} réceptionné (${p.status === 'ready' ? 'à retirer ici' : 'en correspondance'})` });
      }
      this.code.set('');
      await this.load(this.departureId());
    } catch (err) {
      this.feedback.set({ ok: false, text: `${tag} : ${apiErrorMessage(err)}` });
    } finally {
      this.busy.set(false);
    }
  }

  private verb(): string {
    return { load: 'chargé', unload: 'déchargé', deliver: 'remis au passager' }[this.mode()];
  }

  protected async markMissing(b: Baggage): Promise<void> {
    try {
      await this.api.invoke(scanBaggage, { body: { tag: b.tag_number, action: 'missing' } });
      this.feedback.set({ ok: false, text: `Bagage ${b.tag_number} signalé manquant : une réclamation urgente est ouverte.` });
      await this.load(this.departureId());
    } catch (err) {
      this.feedback.set({ ok: false, text: apiErrorMessage(err) });
    }
  }
}
