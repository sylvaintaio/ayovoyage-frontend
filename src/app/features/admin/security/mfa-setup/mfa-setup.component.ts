import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { MfaSetup } from '../../../../api/models';
import { AuthStore } from '../../../../core/auth/auth.store';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { OtpInputComponent } from '../../../../shared/ui/otp-input/otp-input.component';
import { QrCodeComponent } from '../../../../shared/ui/qr-code/qr-code.component';

/** Activation de la double authentification : QR code, clé manuelle, premier code. */
@Component({
  selector: 'bv-mfa-setup',
  imports: [FormsModule, QrCodeComponent, OtpInputComponent],
  templateUrl: './mfa-setup.component.html',
  styleUrl: './mfa-setup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaSetupComponent implements OnInit {
  private readonly auth = inject(AuthStore);

  /** Jeton d'étape (connexion) ; absent si l'utilisateur est déjà connecté. */
  readonly mfaToken = input<string | undefined>();
  /** Émis avec les codes de secours une fois l'activation confirmée. */
  readonly activated = output<string[]>();

  protected readonly setup = signal<MfaSetup | null>(null);
  protected readonly code = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showKey = signal(false);
  /** Clé lisible : groupes de 4 caractères. */
  protected readonly key = computed(
    () =>
      this.setup()
        ?.secret.match(/.{1,4}/g)
        ?.join(' ') ?? '',
  );

  async ngOnInit(): Promise<void> {
    try {
      this.setup.set(await this.auth.setupMfa(this.mfaToken()));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    }
  }

  protected async activate(code = this.code()): Promise<void> {
    if (code.length !== 6 || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      this.activated.emit(await this.auth.activateMfa(code, this.mfaToken()));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
      this.code.set('');
    } finally {
      this.busy.set(false);
    }
  }
}
