import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';


// 🔹 Componenti
import { AppComponent } from './app.component';
import { AuthComponent } from './auth/auth.component';
import { GraphViewComponent } from './components/graph-view/graph-view.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';

import { AuthInterceptor } from './services/auth.interceptor';
import { AuthGuard } from './services/auth.guard';

@NgModule({
  declarations: [
    AppComponent,
    // 👇 GraphViewComponent resta qui solo se NON è standalone
    GraphViewComponent
  ],
    imports: [
         BrowserModule,
          BrowserAnimationsModule,
          HttpClientModule,
          MatSnackBarModule,
          FormsModule,
          ReactiveFormsModule,
          AuthComponent,

        // ✅ Routing corretto
        RouterModule.forRoot([
  { path: 'auth', component: AuthComponent },

  // 🔒 Layout protetto con guardia e children
  {
    path: '',
    component: AuthLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'graph', component: GraphViewComponent },

      // ✅ Aggiungi qui la tua vista 3D
      {
        path: 'graph3d',
        loadComponent: () =>
          import('./components/graph-view-3d/graph-view-3d.component').then(
            (m) => m.GraphView3dComponent
          ),
      },

      // ✅ Già presente: training admin
      {
        path: 'admin/training',
        loadComponent: () =>
          import('./components/admin-training/admin-training.component').then(
            (m) => m.AdminTrainingComponent
          ),
      },

      // redirect di default
      { path: '', redirectTo: 'graph', pathMatch: 'full' },
    ],
  },

  // fallback
  { path: '**', redirectTo: '/auth' },
]),


        // 👇 AuthComponent è standalone, quindi va solo importato
        AuthComponent,
        ReactiveFormsModule
    ],
  providers: [
     AuthGuard,
  {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true
  },
  {
    provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
    useValue: { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' }
  }

  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
