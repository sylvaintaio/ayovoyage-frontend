import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../../api/api';
import { deleteMyAccount, updateMyProfile } from '../../../api/functions';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';

@Component({
  selector: 'bv-profile',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthStore);
  protected readonly saving = signal(false);
  private readonly router = inject(Router);

  // Suppression du compte
  protected readonly showDelete = signal(false);
  protected readonly confirmText = signal('');
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', Validators.email],
    birth_date: [''],
  });

  ngOnInit(): void {
    const c = this.auth.me()?.customer;
    if (c) {
      this.form.patchValue({ full_name: c.full_name, email: c.email ?? '', birth_date: c.birth_date ?? '' });
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    try {
      const me = await this.api.invoke(updateMyProfile, {
        body: { full_name: v.full_name, email: v.email || undefined, birth_date: v.birth_date || undefined },
      });
      this.auth.me.set(me);
      this.toast.success('Profil mis à jour.');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteAccount(): Promise<void> {
    if (this.confirmText().trim().toUpperCase() !== 'SUPPRIMER' || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.api.invoke(deleteMyAccount, { body: { confirm: 'SUPPRIMER' } });
      this.auth.clear();
      this.toast.success('Votre compte a été supprimé.');
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.deleteError.set(apiErrorMessage(err));
    } finally {
      this.deleting.set(false);
    }
  }
}
