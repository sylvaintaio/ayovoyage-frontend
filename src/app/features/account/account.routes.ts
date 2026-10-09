import { Routes } from '@angular/router';

import { AccountLayoutComponent } from './account-layout/account-layout.component';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    component: AccountLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'reservations' },
      {
        path: 'reservations',
        title: 'Mes réservations',
        loadComponent: () => import('./bookings/bookings.component').then((m) => m.BookingsComponent),
      },
      {
        path: 'reservations/:id',
        title: 'Ma réservation',
        loadComponent: () => import('./booking-detail/booking-detail.component').then((m) => m.BookingDetailComponent),
      },
      {
        path: 'reservations/:id/modifier',
        title: 'Changer de départ',
        loadComponent: () => import('./booking-change/booking-change.component').then((m) => m.BookingChangeComponent),
      },
      {
        path: 'billets',
        title: 'Mes billets',
        loadComponent: () => import('./tickets/tickets.component').then((m) => m.TicketsComponent),
      },
      {
        path: 'fidelite',
        title: 'Ma fidélité',
        loadComponent: () => import('./loyalty/loyalty.component').then((m) => m.LoyaltyComponent),
      },
      {
        path: 'factures',
        title: 'Mes factures',
        loadComponent: () => import('./invoices/invoices.component').then((m) => m.MyInvoicesComponent),
      },
      {
        path: 'parrainage',
        title: 'Parrainage',
        loadComponent: () => import('./referral/referral.component').then((m) => m.ReferralComponent),
      },
      {
        path: 'messages',
        title: 'Mes messages',
        loadComponent: () => import('./messages/messages.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'colis',
        title: 'Mes colis',
        loadComponent: () => import('./parcels/parcels.component').then((m) => m.MyParcelsComponent),
      },
      {
        path: 'reclamations',
        title: 'Mes réclamations',
        loadComponent: () => import('./incidents/incidents.component').then((m) => m.MyIncidentsComponent),
      },
      {
        path: 'signaler',
        title: 'Signaler un problème',
        loadComponent: () => import('./report/report.component').then((m) => m.ReportComponent),
      },
      {
        path: 'reclamations/nouvelle',
        title: 'Signaler un problème',
        loadComponent: () => import('./incident-new/incident-new.component').then((m) => m.IncidentNewComponent),
      },
      {
        path: 'reclamations/:id',
        title: 'Ma réclamation',
        loadComponent: () => import('./incident-detail/incident-detail.component').then((m) => m.MyIncidentComponent),
      },
      {
        path: 'proches',
        title: 'Mes proches',
        loadComponent: () => import('./passengers/passengers.component').then((m) => m.PassengersComponent),
      },
      {
        path: 'profil',
        title: 'Mon profil',
        loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
];
