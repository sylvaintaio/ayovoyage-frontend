import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { createIncident } from '../../../api/functions';
import { apiErrorMessage } from '../../../core/http/api-error';
import { INCIDENT_CATEGORY_LABELS } from '../../../shared/pipes/status';
import { PhotoPickerComponent } from '../../../shared/ui/photo-picker/photo-picker.component';

type Category = 'not_received' | 'delayed' | 'damaged' | 'opened' | 'wrong_recipient' | 'wrong_agency' | 'info_error' | 'lost' | 'other';

/** Ouverture d'une réclamation au guichet (client présent) ou sur constat interne. */
@Component({
  selector: 'bv-incident-form',
  imports: [ReactiveFormsModule, RouterLink, PhotoPickerComponent],
  templateUrl: './incident-form.component.html',
  styleUrl: './incident-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentFormComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  /** Pré-remplissage depuis la fiche colis (?colis=CL…) ou bagage (?bagage=BG-…). */
  readonly colis = input<string | undefined>();
  readonly bagage = input<string | undefined>();

  protected readonly categories = Object.entries(INCIDENT_CATEGORY_LABELS) as [Category, string][];
  protected readonly photos = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    kind: ['parcel' as 'parcel' | 'baggage'],
    reference: ['', Validators.required],
    category: ['damaged' as Category, Validators.required],
    priority: ['' as '' | 'low' | 'normal' | 'high' | 'urgent'],
    reporter_name: ['', [Validators.required, Validators.minLength(2)]],
    reporter_phone: ['', [Validators.required, Validators.minLength(8)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnInit(): void {
    if (this.bagage()) {
      this.form.patchValue({ kind: 'baggage', reference: this.bagage()! });
    } else if (this.colis()) {
      this.form.patchValue({ kind: 'parcel', reference: this.colis()! });
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    try {
      const i = await this.api.invoke(createIncident, {
        body: {
          tracking_number: v.kind === 'parcel' ? v.reference.trim() : undefined,
          baggage_tag: v.kind === 'baggage' ? v.reference.trim() : undefined,
          category: v.category,
          priority: v.priority || undefined,
          reporter_name: v.reporter_name,
          reporter_phone: v.reporter_phone,
          description: v.description,
          photos: this.photos().length ? this.photos() : undefined,
        },
      });
      await this.router.navigate(['/admin/reclamations', i.id]);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
