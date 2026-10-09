import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { BRAND } from '../../../content/brand';
import { AuthStore } from '../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../core/http/api-error';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { OtpInputComponent } from '../../../shared/ui/otp-input/otp-input.component';
import { AuthShellComponent } from '../../auth/auth-shell/auth-shell.component';
import { MfaSetupComponent } from '../security/mfa-setup/mfa-setup.component';
import { RecoveryCodesComponent } from '../security/recovery-codes/recovery-codes.component';

/**
 * Connexion du personnel : mot de passe, puis code de double authentification
 * (ou activation de celle-ci, avec affichage des codes de secours).
 */
type Step = 'password' | 'verify' | 'setup' | 'codes';

@Component({
  selector: 'bv-admin-login',
  imports: [ReactiveFormsModule, FormsModule, AuthShellComponent, IconComponent, OtpInputComponent, MfaSetupComponent, RecoveryCodesComponent],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /** Absent de l'URL : Angular fournit undefined. */
  readonly retour = input<string | undefined>();

  protected readonly brand = BRAND.name;
  protected readonly step = signal<Step>('password');
  protected readonly mfaToken = signal('');
  protected readonly code = signal('');
  protected readonly recovery = signal('');
  protected readonly useRecovery = signal(false);
  protected readonly recoveryCodes = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly capsLock = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected detectCaps(event: KeyboardEvent): void {
    this.capsLock.set(event.getModifierState?.('CapsLock') ?? false);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      const res = await this.auth.staffLogin(email.trim(), password);
      if (res.mfa_step && res.mfa_token) {
        this.mfaToken.set(res.mfa_token);
        this.step.set(res.mfa_step);
        return;
      }
      await this.enter();
    } catch (err) {
      this.error.set(apiErrorMessage(err));
      this.form.controls.password.reset();
    } finally {
      this.busy.set(false);
    }
  }

  protected async verify(code = this.code()): Promise<void> {
    const body = this.useRecovery() ? { recovery_code: this.recovery().trim() } : { code };
    if ((!this.useRecovery() && code.length !== 6) || (this.useRecovery() && !body.recovery_code) || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.verifyMfa(this.mfaToken(), body);
      await this.enter();
    } catch (err) {
      this.error.set(apiErrorMessage(err));
      this.code.set('');
      if (err instanceof HttpErrorResponse && err.status === 401) {
        this.restart(); // jeton d'étape expiré : retour au mot de passe
        this.error.set(apiErrorMessage(err));
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected toggleRecovery(): void {
    this.useRecovery.set(!this.useRecovery());
    this.error.set(null);
  }

  protected activated(codes: string[]): void {
    this.recoveryCodes.set(codes);
    this.step.set('codes');
  }

  protected restart(): void {
    this.step.set('password');
    this.mfaToken.set('');
    this.code.set('');
    this.recovery.set('');
    this.useRecovery.set(false);
    this.error.set(null);
    this.form.controls.password.reset();
  }

  protected async enter(): Promise<void> {
    const retour = this.retour() ?? '';
    const target = retour.startsWith('/admin') ? retour : this.home();
    await this.router.navigateByUrl(target);
  }

  /** Page d'accueil selon le rôle. */
  private home(): string {
    if (this.auth.hasRole('cashier')) {
      return '/admin/guichet';
    }
    if (this.auth.hasRole('boarding_agent', 'driver', 'parcel_agent')) {
      return '/admin/departs';
    }
    return '/admin';
  }
}
