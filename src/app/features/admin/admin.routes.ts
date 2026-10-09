import { Routes } from '@angular/router';

import { staffGuard } from '../../core/auth/auth.guards';
import { StaffRole } from '../../core/auth/auth.store';

const ADMIN: StaffRole[] = ['company_admin'];
const MANAGERS: StaffRole[] = ['company_admin', 'agency_manager'];
const PARCEL_DESK: StaffRole[] = ['company_admin', 'agency_manager', 'cashier', 'parcel_agent'];
const PARCEL_STAFF: StaffRole[] = [...PARCEL_DESK, 'boarding_agent', 'driver'];

/** Routes du back-office. Les rôles masquent les écrans ; l'API reste seule juge des droits. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Tableau de bord',
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'agency_manager', 'finance'] },
    loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'guichet',
    title: 'Vente au guichet',
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'agency_manager', 'cashier'] },
    loadComponent: () => import('./counter/counter.component').then((m) => m.CounterComponent),
  },
  {
    path: 'encaisser',
    title: 'À encaisser',
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'agency_manager', 'cashier'] },
    loadComponent: () => import('./collect/collect.component').then((m) => m.CollectComponent),
  },
  {
    path: 'departs',
    title: 'Départs',
    loadComponent: () => import('./departures/departures.component').then((m) => m.DeparturesComponent),
  },
  {
    path: 'departs/:id',
    title: 'Départ',
    loadComponent: () => import('./departure-detail/departure-detail.component').then((m) => m.DepartureDetailComponent),
  },
  {
    path: 'reservations',
    title: 'Réservations',
    loadComponent: () => import('./bookings/bookings.component').then((m) => m.AdminBookingsComponent),
  },
  {
    path: 'reservations/:id',
    title: 'Réservation',
    loadComponent: () => import('./booking-detail/booking-detail.component').then((m) => m.AdminBookingDetailComponent),
  },
  {
    path: 'remboursements',
    title: 'Remboursements',
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'agency_manager', 'finance'] },
    loadComponent: () => import('./refunds/refunds.component').then((m) => m.RefundsComponent),
  },
  {
    path: 'factures',
    title: 'Factures',
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'agency_manager', 'finance'] },
    loadComponent: () => import('./invoices/invoices.component').then((m) => m.InvoicesComponent),
  },
  {
    path: 'agences',
    title: 'Agences',
    canActivate: [staffGuard],
    data: { roles: MANAGERS },
    loadComponent: () => import('./agencies/agencies.component').then((m) => m.AdminAgenciesComponent),
  },
  {
    path: 'agences/nouvelle',
    title: 'Nouvelle agence',
    canActivate: [staffGuard],
    data: { roles: ADMIN },
    loadComponent: () => import('./agency-form/agency-form.component').then((m) => m.AgencyFormComponent),
  },
  {
    path: 'agences/:id',
    title: 'Agence',
    canActivate: [staffGuard],
    data: { roles: MANAGERS },
    loadComponent: () => import('./agency-form/agency-form.component').then((m) => m.AgencyFormComponent),
  },
  {
    path: 'lignes',
    title: 'Lignes',
    canActivate: [staffGuard],
    data: { roles: ADMIN },
    loadComponent: () => import('./routes/routes.component').then((m) => m.RoutesComponent),
  },
  {
    path: 'bus',
    title: 'Bus',
    canActivate: [staffGuard],
    data: { roles: ADMIN },
    loadComponent: () => import('./buses/buses.component').then((m) => m.BusesComponent),
  },
  {
    path: 'plans',
    title: 'Plans de sièges',
    canActivate: [staffGuard],
    data: { roles: ADMIN },
    loadComponent: () => import('./layouts/layouts.component').then((m) => m.LayoutsComponent),
  },
  {
    path: 'plans/:id',
    title: 'Éditeur de plan',
    canActivate: [staffGuard],
    data: { roles: ADMIN },
    loadComponent: () => import('./layout-editor/layout-editor.component').then((m) => m.LayoutEditorComponent),
  },
  {
    path: 'categories',
    title: 'Catégories de sièges',
    canActivate: [staffGuard],
    data: { roles: ADMIN },
    loadComponent: () => import('./categories/categories.component').then((m) => m.CategoriesComponent),
  },
  {
    path: 'avis',
    title: 'Avis des voyageurs',
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'agency_manager'] },
    loadComponent: () => import('./reviews/reviews.component').then((m) => m.AdminReviewsComponent),
  },
  {
    path: 'promotions',
    title: 'Promotions',
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'agency_manager', 'finance'] },
    loadComponent: () => import('./promotions/promotions.component').then((m) => m.PromotionsComponent),
  },
  {
    path: 'fidelite',
    title: 'Fidélité',
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'finance'] },
    loadComponent: () => import('./loyalty/loyalty.component').then((m) => m.AdminLoyaltyComponent),
  },
  {
    path: 'personnel',
    title: 'Personnel',
    canActivate: [staffGuard],
    data: { roles: MANAGERS },
    loadComponent: () => import('./staff/staff.component').then((m) => m.StaffComponent),
  },
  {
    path: 'terminaux',
    title: 'Terminaux',
    canActivate: [staffGuard],
    data: { roles: MANAGERS },
    loadComponent: () => import('./devices/devices.component').then((m) => m.DevicesComponent),
  },
  {
    path: 'journal',
    title: "Journal d'audit",
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'finance'] },
    loadComponent: () => import('./audit/audit.component').then((m) => m.AuditComponent),
  },
  {
    path: 'parametres',
    title: 'Paramètres',
    canActivate: [staffGuard],
    data: { roles: ADMIN },
    loadComponent: () => import('./settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'securite',
    title: 'Sécurité du compte',
    canActivate: [staffGuard],
    loadComponent: () => import('./security/security.component').then((m) => m.SecurityComponent),
  },
  {
    path: 'caisse',
    title: 'Caisse',
    canActivate: [staffGuard],
    data: { roles: ['company_admin', 'agency_manager', 'cashier', 'finance'] },
    loadComponent: () => import('./cash/cash.component').then((m) => m.CashComponent),
  },
  {
    path: 'colis',
    title: 'Colis',
    canActivate: [staffGuard],
    data: { roles: PARCEL_STAFF },
    loadComponent: () => import('./parcels/parcels.component').then((m) => m.ParcelsComponent),
  },
  {
    path: 'colis/nouveau',
    title: 'Nouvel envoi',
    canActivate: [staffGuard],
    data: { roles: PARCEL_DESK },
    loadComponent: () => import('./parcel-form/parcel-form.component').then((m) => m.ParcelFormComponent),
  },
  {
    path: 'colis/:id',
    title: 'Colis',
    canActivate: [staffGuard],
    data: { roles: PARCEL_STAFF },
    loadComponent: () => import('./parcel-detail/parcel-detail.component').then((m) => m.ParcelDetailComponent),
  },
  {
    path: 'reclamations',
    title: 'Réclamations',
    canActivate: [staffGuard],
    data: { roles: PARCEL_DESK },
    loadComponent: () => import('./incidents/incidents.component').then((m) => m.IncidentsComponent),
  },
  {
    path: 'reclamations/nouvelle',
    title: 'Nouvelle réclamation',
    canActivate: [staffGuard],
    data: { roles: PARCEL_DESK },
    loadComponent: () => import('./incident-form/incident-form.component').then((m) => m.IncidentFormComponent),
  },
  {
    path: 'reclamations/:id',
    title: 'Réclamation',
    canActivate: [staffGuard],
    data: { roles: PARCEL_DESK },
    loadComponent: () => import('./incident-detail/incident-detail.component').then((m) => m.IncidentDetailComponent),
  },
];
