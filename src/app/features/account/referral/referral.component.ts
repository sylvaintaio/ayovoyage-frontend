import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Api } from '../../../api/api';
import { enterReferralCode, getMyReferral } from '../../../api/functions';
import { ReferralInfo } from '../../../api/models';
import { BRAND } from '../../../content/brand';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';

/** Parrainage : inviter ses proches (code et lien à partager), ou saisir le code d'un parrain. */
@Component({
  selector: 'bv-referral',
  imports: [StateComponent, FormsModule, DatePipe, MoneyPipe],
  templateUrl: './referral.component.html',
  styleUrl: './referral.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferralComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly info = signal<ReferralInfo | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly code = signal('');
  protected readonly saving = signal(false);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.info.set(await this.api.invoke(getMyReferral));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected whatsappShare(i: ReferralInfo): string {
    const reward = i.referee_reward ? ` et profite d'une remise sur ton premier voyage` : '';
    const text = `Je voyage avec ${BRAND.name} : réservation en ligne, siège au choix. Inscris-toi avec mon lien${reward} : ${i.share_url}`;
    return 'https://wa.me/?text=' + encodeURIComponent(text);
  }

  protected async copy(i: ReferralInfo): Promise<void> {
    try {
      await navigator.clipboard.writeText(i.share_url);
      this.toast.success('Lien copié.');
    } catch {
      this.toast.error('Copie impossible : sélectionnez le lien à la main.');
    }
  }

  protected async submit(): Promise<void> {
    const code = this.code().trim();
    if (code.length < 4) {
      return;
    }
    this.saving.set(true);
    try {
      this.info.set(await this.api.invoke(enterReferralCode, { body: { code } }));
      this.toast.success('Code enregistré : votre offre de bienvenue s’applique à votre premier voyage.');
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
