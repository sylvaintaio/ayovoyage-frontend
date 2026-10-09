import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { createParcel, listAgencies, listParcelTariffs, quoteParcel } from '../../../api/functions';
import { Agency, ParcelQuote, ParcelTariffDto } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PhotoPickerComponent } from '../../../shared/ui/photo-picker/photo-picker.component';

type Category = 'document' | 'small' | 'medium' | 'large' | 'fragile';

/** Dépôt d'un colis au guichet : expéditeur, destinataire, contenu, prix calculé, paiement. */
@Component({
  selector: 'bv-parcel-form',
  imports: [ReactiveFormsModule, RouterLink, MoneyPipe, PhotoPickerComponent],
  templateUrl: './parcel-form.component.html',
  styleUrl: './parcel-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelFormComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Personnel du siège (sans agence) : choisit l'agence de dépôt. */
  protected readonly needsAgency = !this.auth.me()?.staff?.agency_id;
  protected readonly agencies = signal<Agency[]>([]);
  protected readonly tariffs = signal<ParcelTariffDto[]>([]);
  protected readonly quote = signal<ParcelQuote | null>(null);
  protected readonly quoteError = signal<string | null>(null);
  protected readonly photos = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    origin_agency_id: [''],
    destination_agency_id: ['', Validators.required],
    sender_name: ['', [Validators.required, Validators.minLength(2)]],
    sender_phone: ['', [Validators.required, Validators.minLength(8)]],
    sender_email: ['', Validators.email],
    recipient_name: ['', [Validators.required, Validators.minLength(2)]],
    recipient_phone: ['', [Validators.required, Validators.minLength(8)]],
    recipient_email: ['', Validators.email],
    category: ['small' as Category, Validators.required],
    description: ['', [Validators.required, Validators.minLength(2)]],
    weight_kg: [1, [Validators.required, Validators.min(0.01)]],
    pieces: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
    declared_value: [0, Validators.min(0)],
    payer: ['sender' as 'sender' | 'recipient', Validators.required],
  });

  private readonly originId = signal('');
  protected readonly origins = computed(() => this.agencies().filter((a) => a.services.includes('parcel_drop')));
  protected readonly destinations = computed(() =>
    this.agencies().filter((a) => a.services.includes('parcel_pickup') && a.id !== (this.originId() || this.auth.me()?.staff?.agency_id)),
  );
  protected readonly selectedTariff = computed(() => this.tariffs().find((t) => t.category === this.category()));
  private readonly category = signal<Category>('small');
  private quoteTimer: ReturnType<typeof setTimeout> | undefined;

  async ngOnInit(): Promise<void> {
    try {
      const [agencies, tariffs] = await Promise.all([this.api.invoke(listAgencies), this.api.invoke(listParcelTariffs)]);
      this.agencies.set(agencies.filter((a) => a.is_active));
      this.tariffs.set(tariffs);
      if (this.needsAgency) {
        const first = this.origins()[0]?.id ?? '';
        this.form.controls.origin_agency_id.setValue(first);
        this.originId.set(first);
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    }
    this.form.controls.origin_agency_id.valueChanges.subscribe((v) => this.originId.set(v));
    this.form.controls.category.valueChanges.subscribe((v) => this.category.set(v));
    this.form.controls.category.valueChanges.subscribe(() => this.scheduleQuote());
    this.form.controls.weight_kg.valueChanges.subscribe(() => this.scheduleQuote());
    this.form.controls.declared_value.valueChanges.subscribe(() => this.scheduleQuote());
    this.scheduleQuote();
  }

  private scheduleQuote(): void {
    clearTimeout(this.quoteTimer);
    this.quoteTimer = setTimeout(() => void this.refreshQuote(), 250);
  }

  private async refreshQuote(): Promise<void> {
    const v = this.form.getRawValue();
    if (!(v.weight_kg > 0)) {
      this.quote.set(null);
      return;
    }
    try {
      this.quote.set(
        await this.api.invoke(quoteParcel, { body: { category: v.category, weight_kg: Number(v.weight_kg), declared_value: Number(v.declared_value) || undefined } }),
      );
      this.quoteError.set(null);
    } catch (err) {
      this.quote.set(null);
      this.quoteError.set(apiErrorMessage(err));
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.quoteError()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    try {
      const p = await this.api.invoke(createParcel, {
        body: {
          ...v,
          origin_agency_id: this.needsAgency ? v.origin_agency_id || undefined : undefined,
          sender_email: v.sender_email || undefined,
          recipient_email: v.recipient_email || undefined,
          weight_kg: Number(v.weight_kg),
          pieces: Number(v.pieces),
          declared_value: Number(v.declared_value) || undefined,
          photo: this.photos()[0],
        },
      });
      this.toast.success(`Colis ${p.tracking_number} enregistré. Imprimez l’étiquette.`);
      await this.router.navigate(['/admin/colis', p.id], { queryParams: { nouveau: 1 } });
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
