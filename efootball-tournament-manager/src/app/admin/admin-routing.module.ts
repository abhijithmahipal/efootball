import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from '../guards/admin.guard';
import { AdminComponent } from './admin.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminRegisterComponent } from './admin-register/admin-register.component';
import { PlayerManagementComponent } from './player-management/player-management.component';
import { ScheduleGeneratorComponent } from './schedule-generator/schedule-generator.component';
import { MatchResultsComponent } from './match-results/match-results.component';

const routes: Routes = [
  // Login route - standalone, no admin layout
  {
    path: 'login',
    component: AdminLoginComponent,
  },

  // Register route - standalone, no admin layout
  {
    path: 'register',
    component: AdminRegisterComponent,
  },

  // Protected admin routes with admin layout
  {
    path: '',
    component: AdminComponent,
    canActivate: [AdminGuard],
    children: [
      {
        path: 'dashboard',
        redirectTo: 'players', // Redirect to players management as default admin page
        pathMatch: 'full',
      },
      {
        path: 'players',
        component: PlayerManagementComponent,
      },
      {
        path: 'schedule-generator',
        component: ScheduleGeneratorComponent,
      },
      {
        path: 'match-results',
        component: MatchResultsComponent,
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
