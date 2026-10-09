import { Injectable, computed, inject, signal } from '@angular/core';

import { Api } from '../../api/api';
import {
  getMe,
  logout,
  requestOtp,
  staffLogin,
  staffMfaActivate,
  staffMfaSetup,
  staffMfaVerify,
  verifyOtp,
} from '../../api/functions';
import { MeBody, MfaSetup, OtpSent, StaffLoginBody } from '../../api/models';
import { XSRF_COOKIE, readCookie } from '../http/http.interceptors';

export type OtpChannel = 'email' | 'sms';

export type StaffRole =
  | 'company_admin'
  | 'agency_manager'
  | 'cashier'
  | 'boarding_agent'
  | 'driver'
  | 'parcel_agent'
  | 'finance';

export const ROLE_LABELS: Record<StaffRole, string> = {
  company_admin: 'Administrateur',
  agency_manager: "Chef d'agence",
  cashier: 'Caissier',
  boarding_agent: "Agent d'embarquement",
  driver: 'Chauffeur',
  parcel_agent: 'Agent colis',
  finance: 'Finance',
};

/**
 * État de la session. Les jetons ne sont jamais accessibles au JavaScript
 * (cookies HttpOnly) : on ne conserve ici que le profil renvoyé par /v1/me.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(Api);

  readonly me = signal<MeBody | null>(null);
  readonly ready = signal(false);

  readonly isCustomer = computed(() => this.me()?.type === 'customer');
  readonly isStaff = computed(() => this.me()?.type === 'staff');
  readonly role = computed(() => (this.me()?.staff?.role ?? null) as StaffRole | null);
  readonly displayName = computed(() => {
    const me = this.me();
    return me?.customer?.full_name || me?.staff?.full_name || me?.customer?.email || me?.customer?.phone || '';
  });

  /** Charge le profil si une session semble exister (cookie XSRF présent). */
  async load(): Promise<void> {
    try {
      if (readCookie(XSRF_COOKIE)) {
        this.me.set(await this.api.invoke(getMe));
      }
    } catch {
      this.me.set(null);
    } finally {
      this.ready.set(true);
    }
  }

  hasRole(...roles: StaffRole[]): boolean {
    const r = this.role();
    return r !== null && (roles.length === 0 || roles.includes(r));
  }

  /** Envoie un code par e-mail ou par SMS. */
  requestOtp(channel: OtpChannel, destination: string): Promise<OtpSent> {
    return this.api.invoke(requestOtp, { body: channel === 'email' ? { email: destination } : { phone: destination } });
  }

  async verifyOtp(channel: OtpChannel, destination: string, code: string, fullName?: string): Promise<boolean> {
    const target = channel === 'email' ? { email: destination } : { phone: destination };
    const session = await this.api.invoke(verifyOtp, {
      body: { ...target, code, full_name: fullName || undefined },
    });
    this.me.set(await this.api.invoke(getMe));
    return session.is_new_account ?? false;
  }

  /**
   * Étape 1 : mot de passe. Si une étape de double authentification est
   * requise, aucune session n'est ouverte et la réponse contient `mfa_step`.
   */
  async staffLogin(email: string, password: string): Promise<StaffLoginBody> {
    const res = await this.api.invoke(staffLogin, { body: { email, password } });
    if (res.session) {
      this.me.set(await this.api.invoke(getMe));
    }
    return res;
  }

  /** Étape 2 : code de l'application ou code de secours. */
  async verifyMfa(mfaToken: string, code: { code?: string; recovery_code?: string }): Promise<void> {
    await this.api.invoke(staffMfaVerify, { body: { mfa_token: mfaToken, ...code } });
    this.me.set(await this.api.invoke(getMe));
  }

  /** Activation : QR code (jeton d'étape à la connexion, ou session existante). */
  setupMfa(mfaToken?: string): Promise<MfaSetup> {
    return this.api.invoke(staffMfaSetup, { body: { mfa_token: mfaToken } });
  }

  /** Activation : premier code ; renvoie les codes de secours (affichés une seule fois). */
  async activateMfa(code: string, mfaToken?: string): Promise<string[]> {
    const session = await this.api.invoke(staffMfaActivate, { body: { code, mfa_token: mfaToken } });
    this.me.set(await this.api.invoke(getMe));
    return session.recovery_codes ?? [];
  }

  async logout(): Promise<void> {
    try {
      await this.api.invoke(logout, {});
    } finally {
      this.clear();
    }
  }

  clear(): void {
    this.me.set(null);
  }
}
