import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import {
  assignParcel,
  cancelParcel,
  deliverParcel,
  getParcel,
  listParcelDepartureOptions,
  listParcelInvoices,
  resendParcelCode,
  returnParcel,
  scanParcel,
  unassignParcel,
} from '../../../api/functions';
import { Invoice, ParcelDepartureOption, ParcelDetail } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PARCEL_CATEGORY_LABELS } from '../../../shared/pipes/status';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { InvoiceListComponent } from '../../../shared/ui/invoice-list/invoice-list.component';
import { SignaturePadComponent } from '../../../shared/ui/signature-pad/signature-pad.component';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { TimelineComponent, TimelineItem } from '../../../shared/ui/timeline/timeline.component';
import { API_URL } from '../../../core/http/api-url';

/** Fiche colis : informations, actions selon l'étape (affectation, chargement, réception, remise) et historique. */
@Component({
  selector: 'bv-parcel-detail',
  imports: [
    NgTemplateOutlet,
    StateComponent,
    StatusBadgeComponent,
    TimelineComponent,
    SignaturePadComponent,
    InvoiceListComponent,
    IconComponent,
    FormsModule,
    RouterLink,
    DatePipe,
    MoneyPipe,
  ],
  templateUrl: './parcel-detail.component.html',
  styleUrl: './parcel-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelDetailComponent {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly auth = inject(AuthStore);

  readonly id = input.required<string>();
  /** Présent juste après le dépôt : invite à imprimer l'étiquette. */
  readonly nouveau = input<string | undefined>();

  protected readonly parcel = signal<ParcelDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly categories = PARCEL_CATEGORY_LABELS;
  protected readonly canManage = this.auth.hasRole('company_admin', 'agency_manager');
  protected readonly canInvoices = this.auth.hasRole(
    'company_admin',
    'agency_manager',
    'cashier',
    'finance',
    'parcel_agent',
  );
  protected readonly invoices = signal<Invoice[]>([]);

  // Affectation
  protected readonly options = signal<ParcelDepartureOption[]>([]);
  protected readonly showAll = signal(false);
  protected readonly hasDirect = computed(() => this.options().some((o) => o.is_direct));
  /** Départs directs s'il y en a ; sinon les correspondances possibles. */
  protected readonly visibleOptions = computed(() => {
    const direct = this.options().filter((o) => o.is_direct);
    const list = direct.length ? direct : this.options();
    return this.showAll() ? list : list.slice(0, 6);
  });
  protected readonly hiddenCount = computed(() => {
    const direct = this.options().filter((o) => o.is_direct);
    return (direct.length ? direct : this.options()).length - this.visibleOptions().length;
  });
  protected readonly departureId = signal('');

  // Remise
  protected readonly code = signal('');
  protected readonly withoutCode = signal(false);
  protected readonly identity = signal('');
  protected readonly receivedBy = signal('');
  protected readonly signature = signal('');
  protected readonly cashCollected = signal(false);

  protected readonly label = computed(() => `${API_URL}/v1/admin/parcels/${this.id()}/label`);
  protected readonly timeline = computed<TimelineItem[]>(() => {
    const p = this.parcel();
    if (!p) {
      return [];
    }
    return [...p.events].reverse().map((e, i) => ({
      label: e.label || e.type,
      at: e.created_at,
      place: e.agency || undefined,
      author: e.staff || undefined,
      note: e.note || undefined,
      tone:
        e.type === 'incident' || e.type === 'left_behind' ? 'alert' : i === 0 ? 'current' : 'done',
    }));
  });
  protected readonly amountDue = computed(() => {
    const p = this.parcel();
    return p && !p.paid && p.payer === 'recipient' ? p.price : 0;
  });

  constructor() {
    effect(() => void this.load(this.id()));
  }

  protected async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.set(await this.api.invoke(getParcel, { id }));
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Colis introuvable.'));
    } finally {
      this.loading.set(false);
    }
  }

  private set(p: ParcelDetail): void {
    this.parcel.set(p);
    if (this.canInvoices && p.paid) {
      this.api.invoke(listParcelInvoices, { id: p.id }).then(
        (list) => this.invoices.set(list),
        () => this.invoices.set([]),
      );
    } else {
      this.invoices.set([]);
    }
    this.receivedBy.set(p.recipient_name);
    this.code.set('');
    this.signature.set('');
    this.cashCollected.set(false);
    if (p.status === 'accepted' || p.status === 'arrived') {
      this.api.invoke(listParcelDepartureOptions, { id: p.id }).then(
        (o) => {
          this.options.set(o);
          this.showAll.set(false);
          this.departureId.set((o.find((x) => x.is_direct) ?? o[0])?.id ?? '');
        },
        () => this.options.set([]),
      );
    }
  }

  private async run(fn: () => Promise<ParcelDetail>, success: string): Promise<void> {
    this.busy.set(true);
    try {
      this.set(await fn());
      this.toast.success(success);
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected assign(): Promise<void> {
    return this.run(
      () =>
        this.api.invoke(assignParcel, {
          id: this.id(),
          body: { departure_id: this.departureId() },
        }),
      'Colis affecté au départ.',
    );
  }

  protected load_(): Promise<void> {
    const p = this.parcel()!;
    return this.run(
      () =>
        this.api.invoke(scanParcel, {
          body: { tracking: p.tracking_number, action: 'load', departure_id: p.departure_id },
        }),
      'Colis chargé.',
    );
  }

  protected receive(): Promise<void> {
    return this.run(
      () =>
        this.api.invoke(scanParcel, {
          body: { tracking: this.parcel()!.tracking_number, action: 'receive' },
        }),
      'Colis réceptionné.',
    );
  }

  protected async unassign(): Promise<void> {
    if (
      await this.dialog.confirm({
        title: 'Retirer le colis du départ ?',
        message: 'Il restera en agence, à réaffecter.',
        confirmLabel: 'Retirer',
      })
    ) {
      await this.run(
        () =>
          this.api.invoke(unassignParcel, {
            id: this.id(),
            body: { reason: 'Retiré par l’agence' },
          }),
        'Colis retiré du départ.',
      );
    }
  }

  protected resend(): Promise<void> {
    return this.run(
      () => this.api.invoke(resendParcelCode, { id: this.id() }),
      'Nouveau code envoyé au destinataire.',
    );
  }

  protected async cancel(): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Annuler cet envoi ?',
      message:
        'À faire avant le départ du colis. S’il a été payé, remboursez l’expéditeur en caisse.',
      confirmLabel: 'Annuler l’envoi',
      danger: true,
    });
    if (ok) {
      await this.run(
        () =>
          this.api.invoke(cancelParcel, {
            id: this.id(),
            body: { reason: 'Annulé à la demande de l’expéditeur' },
          }),
        'Envoi annulé.',
      );
    }
  }

  protected async returnToSender(): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Rendre le colis à l’expéditeur ?',
      message: 'Confirmez que l’expéditeur a récupéré son colis.',
      confirmLabel: 'Colis rendu',
    });
    if (ok) {
      await this.run(
        () =>
          this.api.invoke(returnParcel, {
            id: this.id(),
            body: { reason: 'Rendu à l’expéditeur' },
          }),
        'Colis rendu à l’expéditeur.',
      );
    }
  }

  protected deliverReady(): boolean {
    const codeOk = this.withoutCode()
      ? this.identity().trim().length >= 5
      : /^\d{6}$/.test(this.code());
    return (
      codeOk &&
      this.receivedBy().trim().length >= 2 &&
      !!this.signature() &&
      (!this.amountDue() || this.cashCollected())
    );
  }

  protected deliver(): Promise<void> {
    return this.run(
      () =>
        this.api.invoke(deliverParcel, {
          id: this.id(),
          body: {
            code: this.withoutCode() ? undefined : this.code(),
            identity_document: this.withoutCode() ? this.identity().trim() : undefined,
            received_by: this.receivedBy().trim(),
            signature: this.signature(),
            collect_payment: this.cashCollected() || undefined,
          },
        }),
      'Colis remis au destinataire.',
    );
  }
}
