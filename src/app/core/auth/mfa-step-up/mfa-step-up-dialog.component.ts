import { DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Api } from '../../../api/api';
import { getMyMfa, staffMfaStepUp } from '../../../api/functions';
import { OtpInputComponent } from '../../../shared/ui/otp-input/otp-input.component';
import { apiErrorMessage } from '../../http/api-error';

/** Confirmation d'identité avant une action sensible (code valable 15 minutes). */
@Component({
  selector: 'bv-mfa-step-up-dialog',
  imports: [FormsModule, OtpInputComponent],
  templateUrl: './mfa-step-up-dialog.component.html',
  styleUrl: './mfa-step-up-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaStepUpDialogComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected readonly enabled = signal<boolean | null>(null);
  protected readonly code = signal('');
  protected readonly recovery = signal('');
  protected readonly useRecovery = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.enabled.set((await this.api.invoke(getMyMfa)).enabled);
    } catch {
      this.enabled.set(true);
    }
  }

  protected async confirm(code = this.code()): Promise<void> {
    const body = this.useRecovery() ? { recovery_code: this.recovery().trim() } : { code };
    if (
      (!this.useRecovery() && code.length !== 6) ||
      (this.useRecovery() && !body.recovery_code) ||
      this.busy()
    ) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.invoke(staffMfaStepUp, { body });
      this.ref.close(true);
    } catch (err) {
      this.error.set(apiErrorMessage(err));
      this.code.set('');
    } finally {
      this.busy.set(false);
    }
  }

  protected async goToSecurity(): Promise<void> {
    this.ref.close(false);
    await this.router.navigateByUrl('/admin/securite');
  }
}
