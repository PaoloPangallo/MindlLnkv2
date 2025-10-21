import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { RouterModule } from '@angular/router';

// 🔹 Componenti
import { AppComponent } from './app.component';
import { AuthComponent } from './auth/auth.component';
import { GraphViewComponent } from './components/graph-view/graph-view.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';

// 🔹 Servizi e guardie
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

        // ✅ Routing corretto
        RouterModule.forRoot([
            {path: 'auth', component: AuthComponent},


            // 🔒 Layout protetto con guardia e children
            {
                path: '',
                component: AuthLayoutComponent,
                canActivate: [AuthGuard],
                children: [
                    {path: 'graph', component: GraphViewComponent},
                    { path: 'admin/training', loadComponent: () => import('./components/admin-training/admin-training.component').then(m => m.AdminTrainingComponent) },
                    {path: '', redirectTo: 'graph', pathMatch: 'full'}
                ]
            },

            {path: '**', redirectTo: '/auth'}
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
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
