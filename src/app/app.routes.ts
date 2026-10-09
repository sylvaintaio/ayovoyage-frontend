import { Routes } from '@angular/router';

import { customerGuard, staffGuard } from './core/auth/auth.guards';
import { AdminLayoutComponent } from './core/layout/admin-layout/admin-layout.component';
import { PublicLayoutComponent } from './core/layout/public-layout/public-layout.component';

/**
 * Trois espaces dans une seule application, chacun chargé à la demande :
 * un voyageur ne télécharge jamais le code du back-office.
 */
export const routes: Routes = [
  {
    path: 'admin/connexion',
    title: 'Connexion',
    loadComponent: () => import('./features/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'connexion',
    title: 'Connexion',
    loadComponent: () =>
      import('./features/auth/customer-login/customer-login.component').then((m) => m.CustomerLoginComponent),
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [staffGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      // L'espace client est déclaré avant les pages publiques, qui se terminent par la page 404.
      {
        path: 'compte',
        canActivate: [customerGuard],
        loadChildren: () => import('./features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
      { path: '', loadChildren: () => import('./features/public/public.routes').then((m) => m.PUBLIC_ROUTES) },
    ],
  },
];
