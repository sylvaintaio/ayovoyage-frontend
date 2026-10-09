import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import { createStaff, listAgencies, listStaff, resetStaffMfa, resetStaffPassword, updateStaff } from '../../../api/functions';
import { Agency, Staff } from '../../../api/models';
import { AuthStore, ROLE_LABELS, StaffRole } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { DialogService } from '../../../core/dialog/dialog.service';
import { ToastService } from '../../../core/notify/toast.service';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Comptes du personnel : rôles, agence de rattachement, activation, mot de passe. */
@Component({
  selector: 'bv-staff',
  imports: [StateComponent, ReactiveFormsModule, DatePipe],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthStore);
  private readonly dialog = inject(DialogService);

  protected readonly staff = signal<Staff[]>([]);
  protected readonly agencies = signal<Agency[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<Staff | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly roles = Object.entries(ROLE_LABELS) as [StaffRole, string][];
  protected readonly roleLabels = ROLE_LABELS as Record<string, string>;
  protected readonly isAdmin = this.auth.hasRole('company_admin');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    role: ['cashier' as StaffRole, Validators.required],
    agency_id: [''],
    is_active: [true],
    password: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [staff, agencies] = await Promise.all([this.api.invoke(listStaff), this.api.invoke(listAgencies)]);
      this.staff.set(staff);
      this.agencies.set(agencies);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected agencyName(id?: string): string {
    return this.agencies().find((a) => a.id === id)?.name ?? '—';
  }

  protected edit(s: Staff | 'new'): void {
    this.editing.set(s);
    if (s === 'new') {
      this.form.reset();
      this.form.controls.email.enable();
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(12)]);
    } else {
      this.form.reset({ ...s, role: s.role as StaffRole, agency_id: s.agency_id ?? '', password: '' });
      this.form.controls.email.disable();
      this.form.controls.password.setValidators([Validators.minLength(12)]);
    }
    this.form.controls.password.updateValueAndValidity();
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const current = this.editing();
    const common = { full_name: v.full_name, phone: v.phone, role: v.role, agency_id: v.agency_id || undefined };
    this.saving.set(true);
    try {
      if (current === 'new') {
        await this.api.invoke(createStaff, { body: { ...common, email: v.email, password: v.password } });
      } else if (current) {
        await this.api.invoke(updateStaff, { id: current.id, body: { ...common, is_active: v.is_active } });
        if (v.password) {
          await this.api.invoke(resetStaffPassword, { id: current.id, body: { password: v.password } });
        }
      }
      this.toast.success('Compte enregistré.');
      this.editing.set(null);
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  /** Téléphone perdu : la personne reconfigurera la double authentification à sa prochaine connexion. */
  protected async resetMfa(s: Staff): Promise<void> {
    const ok = await this.dialog.confirm({
      title: `Réinitialiser la double authentification de ${s.full_name} ?`,
      message:
        'Ses sessions seront fermées et ses codes de secours supprimés. À sa prochaine connexion, il devra scanner un nouveau QR code. Vérifiez son identité avant de continuer.',
      confirmLabel: 'Réinitialiser',
      danger: true,
    });
    if (!ok) {
      return;
    }
    try {
      await this.api.invoke(resetStaffMfa, { id: s.id });
      this.toast.success('Double authentification réinitialisée.');
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    }
  }
}
