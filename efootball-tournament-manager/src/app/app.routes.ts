import { Routes } from '@angular/router';

export const routes: Routes = [
  // Default redirect
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // Admin routes with lazy loading (no main header)
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.module').then((m) => m.AdminModule),
  },

  // Public routes with main layout (includes header)
  {
    path: '',
    loadComponent: () =>
      import('./components/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./components/home/home.component').then(
            (m) => m.HomeComponent
          ),
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./components/schedule/schedule.component').then(
            (m) => m.ScheduleComponent
          ),
      },
      {
        path: 'standings',
        loadComponent: () =>
          import('./components/standings/standings.component').then(
            (m) => m.StandingsComponent
          ),
      },
    ],
  },

  // Wildcard route
  { path: '**', redirectTo: '/home' },
];
