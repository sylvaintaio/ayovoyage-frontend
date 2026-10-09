import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { MessagesComponent } from './messages.component';

describe('MessagesComponent', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [MessagesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(MessagesComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, http, el: fixture.nativeElement as HTMLElement };
  }

  it('affiche les e-mails et SMS reçus avec leur contenu', async () => {
    const { fixture, http, el } = await setup();
    http.expectOne((r) => r.url === '/api/v1/me/messages').flush([
      {
        id: 2, channel: 'sms', template: 'departure_boarding', recipient: '+22997000000', status: 'failed',
        subject: '', body: 'L’embarquement est ouvert.', company: 'Trans Express', created_at: '2026-10-08T10:00:00Z',
      },
      {
        id: 1, channel: 'email', template: 'welcome', recipient: 'awa@exemple.bj', status: 'sent',
        subject: 'Bienvenue chez BUS-VOYAGE, Awa', body: 'Bonjour Awa,', created_at: '2026-10-08T09:00:00Z',
      },
    ]);
    await settle(fixture);

    const titles = [...el.querySelectorAll('.msg__title')].map((t) => t.textContent?.trim());
    expect(titles).toEqual(['Embarquement ouvert', 'Bienvenue chez BUS-VOYAGE, Awa']);
    expect(el.textContent).toContain('Non distribué');
    expect(el.textContent).toContain('Bonjour Awa,');
  });

  it('indique quand aucun message n’a été envoyé', async () => {
    const { fixture, http, el } = await setup();
    http.expectOne((r) => r.url === '/api/v1/me/messages').flush([]);
    await settle(fixture);
    expect(el.textContent).toContain('Aucun message pour l’instant');
  });
});
