import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import { enterReferralCode, getAuthOptions, updateMyProfile } from '../../../api/functions';
import { COMPANY } from '../../../content/site-content';
import { AuthStore, OtpChannel } from '../../../core/auth/auth.store';
import { apiErrorMessage, apiErrorStatus } from '../../../core/http/api-error';
import { whatsappUrl } from '../../public/agency-utils';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { OtpInputComponent } from '../../../shared/ui/otp-input/otp-input.component';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';

type Step = 'identify' | 'code' | 'name';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_DELAY = 60;

/** Format d'affichage : « 01 97 00 00 01 ». */
export function formatLocalPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

/** « +2290197000001 » → « +229 01 97 00 00 01 ». */
export function formatE164(phone: string): string {
  const m = /^\+229(\d{8,10})$/.exec(phone);
  return m ? `+229 ${formatLocalPhone(m[1])}` : phone;
}

/**
 * Connexion voyageur sans mot de passe : e-mail ou téléphone selon les canaux
 * actifs (GET /v1/public/auth-options), code à 6 chiffres, puis nom complet
 * uniquement lors de la création du compte.
 */
@Component({
  selector: 'bv-customer-login',
  imports: [AuthShellComponent, OtpInputComponent, IconComponent, FormsModule, RouterLink],
  templateUrl: './customer-login.component.html',
  styleUrl: './customer-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerLoginComponent implements OnInit {
  private readonly auth = inject(AuthStore);
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  /** URL de retour (?retour=…). Absente : undefined. */
  readonly retour = input<string | undefined>();
  /** Lien d'invitation d'un parrain (?parrain=CODE). */
  readonly parrain = input<string | undefined>();
  /** Arrivée depuis « Signaler un problème ». */
  protected readonly forReport = computed(() => (this.retour() ?? '').startsWith('/compte/signaler'));

  protected readonly step = signal<Step>('identify');
  /** Canaux actifs côté serveur (e-mail tant qu'aucun fournisseur SMS n'est branché). */
  protected readonly channels = signal<OtpChannel[]>(['email']);
  protected readonly channel = signal<OtpChannel>('email');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly international = computed(() => this.phone().trim().startsWith('+'));
  protected readonly normalized = signal('');
  protected readonly code = signal('');
  protected readonly fullName = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly codeInvalid = signal(false);
  protected readonly resendIn = signal(0);
  protected readonly shownDestination = computed(() =>
    this.channel() === 'email' ? this.normalized() : formatE164(this.normalized()),
  );
  protected readonly whatsapp = whatsappUrl(COMPANY.whatsapp);

  protected readonly phoneValid = computed(() => this.phone().replace(/\D/g, '').length >= 8);
  protected readonly emailValid = computed(() => EMAIL_RE.test(this.email().trim()));
  protected readonly canSend = computed(() => (this.channel() === 'email' ? this.emailValid() : this.phoneValid()));

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  async ngOnInit(): Promise<void> {
    try {
      const opts = await this.api.invoke(getAuthOptions);
      const list = opts.channels.filter((c): c is OtpChannel => c === 'email' || c === 'sms');
      if (list.length) {
        this.channels.set(list);
        this.channel.set(list[0]);
      }
    } catch {
      // Valeur par défaut : e-mail.
    }
  }

  protected setChannel(ch: OtpChannel): void {
    this.channel.set(ch);
    this.error.set(null);
  }

  protected onPhoneInput(value: string): void {
    this.phone.set(value.trim().startsWith('+') ? value : formatLocalPhone(value));
    this.error.set(null);
  }

  protected async sendCode(): Promise<void> {
    if (!this.canSend()) {
      this.error.set(this.channel() === 'email' ? 'Saisissez une adresse e-mail valide.' : 'Saisissez un numéro de téléphone valide.');
      return;
    }
    await this.run(async () => {
      const value = this.channel() === 'email' ? this.email().trim() : this.phone();
      const res = await this.auth.requestOtp(this.channel(), value);
      this.normalized.set(res.destination);
      this.code.set('');
      this.codeInvalid.set(false);
      this.step.set('code');
      this.startTimer();
    });
  }

  protected async verify(code = this.code()): Promise<void> {
    if (code.length !== 6 || this.busy()) {
      return;
    }
    await this.run(async () => {
      try {
        const isNew = await this.auth.verifyOtp(this.channel(), this.normalized(), code);
        if (isNew || !this.auth.me()?.customer?.full_name) {
          this.step.set('name');
          return;
        }
        await this.redirect();
      } catch (err) {
        if (apiErrorStatus(err) === 400) {
          this.codeInvalid.set(true);
          this.code.set('');
        }
        throw err;
      }
    });
  }

  protected async saveName(): Promise<void> {
    const name = this.fullName().trim();
    if (name.length < 2) {
      this.error.set('Indiquez votre nom et votre prénom.');
      return;
    }
    await this.run(async () => {
      this.auth.me.set(await this.api.invoke(updateMyProfile, { body: { full_name: name } }));
      await this.redirect();
    });
  }

  protected changeDestination(): void {
    this.stopTimer();
    this.step.set('identify');
    this.error.set(null);
  }

  private async redirect(): Promise<void> {
    const code = (this.parrain() ?? '').trim();
    if (code) {
      // Le serveur refuse proprement (déjà parrainé, déjà voyagé…) : la page de parrainage affiche l'état.
      await this.api.invoke(enterReferralCode, { body: { code } }).catch(() => undefined);
      await this.router.navigateByUrl('/compte/parrainage');
      return;
    }
    const retour = this.retour() ?? '';
    await this.router.navigateByUrl(retour.startsWith('/') && !retour.startsWith('//') ? retour : '/compte');
  }

  private startTimer(): void {
    this.stopTimer();
    this.resendIn.set(RESEND_DELAY);
    this.timer = setInterval(() => {
      this.resendIn.update((s) => Math.max(0, s - 1));
      if (this.resendIn() === 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async run(fn: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await fn();
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
