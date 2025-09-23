import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminRegisterComponent } from './admin-register/admin-register.component';
import { PlayerManagementComponent } from './player-management/player-management.component';
import { ScheduleGeneratorComponent } from './schedule-generator/schedule-generator.component';
import { MatchResultsComponent } from './match-results/match-results.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AdminRoutingModule,
    AdminComponent,
    AdminLoginComponent,
    AdminRegisterComponent,
    PlayerManagementComponent,
    ScheduleGeneratorComponent,
    MatchResultsComponent,
  ],
})
export class AdminModule {}
