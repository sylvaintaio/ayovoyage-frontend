import { Routes } from '@angular/router';

import { customerGuard } from '../../core/auth/auth.guards';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'recherche',
    title: 'Départs disponibles',
    loadComponent: () => import('./search-results/search-results.component').then((m) => m.SearchResultsComponent),
  },
  {
    path: 'departs/:id',
    title: 'Choisir mes sièges',
    loadComponent: () => import('./departure/departure.component').then((m) => m.DepartureComponent),
  },
  {
    path: 'reservation/:id/paiement',
    title: 'Paiement',
    canActivate: [customerGuard],
    loadComponent: () => import('./payment/payment.component').then((m) => m.PaymentComponent),
  },
  {
    path: 'reservation/:id/confirmation',
    title: 'Confirmation',
    canActivate: [customerGuard],
    loadComponent: () => import('./confirmation/confirmation.component').then((m) => m.ConfirmationComponent),
  },
  {
    path: 'colis/suivi/:numero',
    title: 'Suivi de colis',
    loadComponent: () => import('./parcel-tracking/parcel-tracking.component').then((m) => m.ParcelTrackingComponent),
  },
  {
    path: 'reclamation/:reference',
    title: 'Ma réclamation',
    loadComponent: () => import('./incident-status/incident-status.component').then((m) => m.IncidentStatusComponent),
  },
  {
    path: 'avis/:token',
    title: 'Votre avis',
    loadComponent: () => import('./review/review.component').then((m) => m.ReviewComponent),
  },
  {
    path: 'agences',
    title: 'Nos agences',
    loadComponent: () => import('./agencies/agencies.component').then((m) => m.AgenciesComponent),
  },
  {
    path: 'agences/:slug',
    title: 'Agence',
    loadComponent: () => import('./agency/agency.component').then((m) => m.AgencyComponent),
  },
  {
    path: 'lignes',
    title: 'Lignes et tarifs',
    loadComponent: () => import('./lines/lines.component').then((m) => m.LinesComponent),
  },
  {
    path: 'services',
    title: 'Nos services',
    loadComponent: () => import('./services/services.component').then((m) => m.ServicesComponent),
  },
  {
    path: 'colis',
    title: 'Envoi de colis',
    loadComponent: () => import('./parcel/parcel.component').then((m) => m.ParcelComponent),
  },
  {
    path: 'fidelite',
    title: 'Programme de fidélité',
    loadComponent: () => import('./loyalty-info/loyalty-info.component').then((m) => m.LoyaltyInfoComponent),
  },
  {
    path: 'a-propos',
    title: 'À propos',
    loadComponent: () => import('./about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'faq',
    title: 'Questions fréquentes',
    loadComponent: () => import('./faq/faq.component').then((m) => m.FaqComponent),
  },
  {
    path: 'conditions',
    title: 'Conditions de voyage',
    loadComponent: () => import('./conditions/conditions.component').then((m) => m.ConditionsComponent),
  },
  {
    path: 'mentions-legales',
    title: 'Mentions légales',
    data: { page: 'mentions' },
    loadComponent: () => import('./legal/legal.component').then((m) => m.LegalComponent),
  },
  {
    path: 'confidentialite',
    title: 'Politique de confidentialité',
    data: { page: 'confidentialite' },
    loadComponent: () => import('./legal/legal.component').then((m) => m.LegalComponent),
  },
  {
    path: 'contact',
    title: 'Contact',
    loadComponent: () => import('./contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: '**',
    title: 'Page introuvable',
    loadComponent: () => import('./not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
