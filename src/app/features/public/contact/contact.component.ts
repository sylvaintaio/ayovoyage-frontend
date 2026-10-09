import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { COMPANY } from '../../../content/site-content';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { whatsappUrl } from '../agency-utils';
import { PageBannerComponent } from '../sections/page-banner/page-banner.component';

/**
 * Contact. La demande est envoyée via WhatsApp ou e-mail (applications du visiteur) :
 * aucune donnée n'est stockée par le site.
 */
@Component({
  selector: 'bv-contact',
  imports: [ReactiveFormsModule, RouterLink, IconComponent, PageBannerComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  protected readonly company = COMPANY;
  protected readonly tel = 'tel:' + COMPANY.phone.replace(/\s/g, '');
  protected readonly whatsapp = whatsappUrl(COMPANY.whatsapp);
  protected readonly subjects = ['Voyage de groupe', 'Compte entreprise', 'Envoi de colis', 'Réclamation', 'Autre demande'];

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(8)]],
    subject: [this.subjects[0]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  /** Texte du message prérempli. */
  message(): string {
    const v = this.form.getRawValue();
    return `${v.subject}\n\n${v.message}\n\n${v.name} — ${v.phone}`;
  }

  protected send(channel: 'whatsapp' | 'email'): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const text = encodeURIComponent(this.message());
    const url =
      channel === 'whatsapp' && this.whatsapp
        ? `${this.whatsapp}?text=${text}`
        : `mailto:${this.company.email}?subject=${encodeURIComponent(this.form.getRawValue().subject)}&body=${text}`;
    window.open(url, '_blank', 'noopener');
  }
}
