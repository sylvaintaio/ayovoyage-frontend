import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { Api } from '../../../api/api';
import { getMyMfa, regenerateMyRecoveryCodes } from '../../../api/functions';
import { MfaStatus } from '../../../api/models';
import { AuthStore } from '../../../core/auth/auth.store';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { StateComponent } from '../../../shared/ui/state/state.component';
import { MfaSetupComponent } from './mfa-setup/mfa-setup.component';
import { RecoveryCodesComponent } from './recovery-codes/recovery-codes.component';

/** Sécurité du compte : activation de la double authentification et codes de secours. */
@Component({
  selector: 'bv-security',
  imports: [StateComponent, MfaSetupComponent, RecoveryCodesComponent, DatePipe],
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthStore);

  protected readonly status = signal<MfaStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly settingUp = signal(false);
  protected readonly codes = signal<string[]>([]);
  protected readonly busy = signal(false);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.status.set(await this.api.invoke(getMyMfa));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected activated(codes: string[]): void {
    this.settingUp.set(false);
    this.codes.set(codes);
    this.toast.success('Double authentification activée.');
  }

  protected async regenerate(): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Générer de nouveaux codes de secours ?',
      message: 'Vos codes actuels ne fonctionneront plus. Conservez les nouveaux en lieu sûr.',
      confirmLabel: 'Générer',
    });
    if (!ok) {
      return;
    }
    this.busy.set(true);
    try {
      this.codes.set((await this.api.invoke(regenerateMyRecoveryCodes, {})).recovery_codes);
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected async codesSaved(): Promise<void> {
    this.codes.set([]);
    await this.load();
  }
}
