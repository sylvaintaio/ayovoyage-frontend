import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../../api/api';
import { listAgencies } from '../../../../api/functions';
import { Agency, Refund } from '../../../../api/models';
import { AuthStore } from '../../../../core/auth/auth.store';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

export type PayoutMethod = 'mobile_money' | 'cash' | 'bank_transfer' | 'other';

export interface Payout {
  method: PayoutMethod;
  agency_id?: string;
}

/** Versement d'un remboursement : mode (et agence si espèces, déduites de sa caisse). */
@Component({
  selector: 'bv-payout-dialog',
  imports: [FormsModule, MoneyPipe],
  templateUrl: './payout-dialog.component.html',
  styleUrl: './payout-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayoutDialogComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthStore);
  protected readonly ref = inject<DialogRef<Payout>>(DialogRef);
  protected readonly refund = inject<Refund>(DIALOG_DATA);

  protected readonly methods: { value: PayoutMethod; label: string; hint: string }[] = [
    { value: 'mobile_money', label: 'Mobile Money', hint: 'Renvoyé sur le numéro du client' },
    { value: 'cash', label: 'Espèces en agence', hint: 'Déduit de la caisse de l’agence' },
    { value: 'bank_transfer', label: 'Virement bancaire', hint: '' },
    { value: 'other', label: 'Autre', hint: '' },
  ];
  protected readonly method = signal<PayoutMethod>('mobile_money');
  /** Personnel du siège : choisit l'agence qui verse les espèces. */
  protected readonly needsAgency = !this.auth.me()?.staff?.agency_id;
  protected readonly agencies = signal<Agency[]>([]);
  protected readonly agencyId = signal('');

  async ngOnInit(): Promise<void> {
    if (this.needsAgency) {
      try {
        const list = (await this.api.invoke(listAgencies)).filter((a) => a.is_active);
        this.agencies.set(list);
        this.agencyId.set(list[0]?.id ?? '');
      } catch {
        // la liste reste vide : le serveur demandera l'agence
      }
    }
  }

  protected confirm(): void {
    const m = this.method();
    this.ref.close({ method: m, agency_id: m === 'cash' && this.needsAgency ? this.agencyId() || undefined : undefined });
  }
}
