import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';

// 🔹 Componenti principali
import { AppComponent } from './app.component';
import { AuthComponent } from './auth/auth.component'; // Standalone ✅
import { GraphViewComponent } from './components/graph-view/graph-view.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';

// 🔹 Servizi e guardie
import { AuthInterceptor } from './services/auth.interceptor';
import { AuthGuard } from './services/auth.guard';
import {NavbarComponent} from "./components/navbar/navbar.component";
import { SearchPanelComponent } from './components/search-panel/search-panel.component';

@NgModule({
  declarations: [
    AppComponent// layout principale
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatSnackBarModule,

    // ============================================================
    // ✅ ROUTING COMPLETO E COERENTE CON LA NAVBAR
    // ============================================================
    RouterModule.forRoot([
      // 🟢 Area pubblica (login / registrazione)
      {path: 'auth', component: AuthComponent},

      // 🔒 Area protetta (autenticata)
      {
        path: '',
        component: AuthLayoutComponent,
        canActivate: [AuthGuard],
        children: [
          // principali
          {path: 'graph', component: GraphViewComponent},
          {
            path: 'graph3d',
            loadComponent: () =>
              import('./components/graph-view-3d/graph-view-3d.component').then(
                (m) => m.GraphView3dComponent
              ),
          },

          // navbar links
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./components/dashboard/dashboard.component').then(
                (m) => m.DashboardComponent
              ),
          },
          {
            path: 'ideas',
            loadComponent: () =>
              import('./components/ideas/ideas.component').then(
                (m) => m.IdeasComponent
              ),
          },
          {
            path: 'explore',
            loadComponent: () =>
              import('./components/explore/explore.component').then(
                (m) => m.ExploreComponent
              ),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./components/settings/settings.component').then(
                (m) => m.SettingsComponent
              ),
          },

          // Admin
          {
            path: 'admin/training',
            loadComponent: () =>
              import('./components/admin-training/admin-training.component').then(
                (m) => m.AdminTrainingComponent
              ),
          },

          // Redirect default
          {path: '', redirectTo: 'graph', pathMatch: 'full'},
        ],
      },

      // fallback
      {path: '**', redirectTo: '/auth'},
    ]),

    // Standalone component
    AuthLayoutComponent,
    NavbarComponent,
    GraphViewComponent,
    SearchPanelComponent,
  ],

  providers: [
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      },
    },
  ],

  bootstrap: [AppComponent],
  exports: [
    SearchPanelComponent
  ]
})
export class AppModule {}
