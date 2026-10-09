import { registerLocaleData } from '@angular/common';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withNoXsrfProtection,
} from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';

import { provideApiConfiguration } from './api/api-configuration';
import { API_URL } from './core/http/api-url';
import { routes } from './app.routes';
import { AuthStore } from './core/auth/auth.store';
import {
  authRefreshInterceptor,
  clientTypeInterceptor,
  mfaStepUpInterceptor,
  xsrfInterceptor,
} from './core/http/http.interceptors';
import { BrandTitleStrategy } from './core/layout/brand-title.strategy';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: TitleStrategy, useClass: BrandTitleStrategy },
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    // Ordre : le premier intercepteur est le plus externe. Le XSRF est le plus
    // interne pour être réévalué lors d'une nouvelle tentative après rafraîchissement.
    provideHttpClient(
      withFetch(),
      withNoXsrfProtection(),
      withInterceptors([
        clientTypeInterceptor,
        authRefreshInterceptor,
        mfaStepUpInterceptor,
        xsrfInterceptor,
      ]),
    ),
    // L'API est servie sous environment.apiUrl (proxy de ng serve en dev, redirection de l'hébergeur en production).
    provideApiConfiguration(API_URL),
    { provide: LOCALE_ID, useValue: 'fr' },
    // Heure du Bénin (UTC+1) pour tous les affichages de dates.
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: { timezone: '+0100', dateFormat: 'dd/MM/yyyy HH:mm' },
    },
    provideAppInitializer(() => inject(AuthStore).load()),
  ],
};
