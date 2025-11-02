// src/admin/admin-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// 🔹 Importa i componenti admin
import { AdminUsersComponent } from './component/admin-users/admin-users.component';
import {AdminTrainingComponent} from "../app/components/admin-training/admin-training.component";
// (in futuro: AdminDashboardComponent, AdminTrainingComponent, ecc.)

const routes: Routes = [
  {
    path: '',
    children: [
      { path: 'users', component: AdminUsersComponent },
      { path: 'training', component: AdminTrainingComponent },
      // aggiungeremo: { path: 'dashboard', component: AdminDashboardComponent },
      { path: '', redirectTo: 'users', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
