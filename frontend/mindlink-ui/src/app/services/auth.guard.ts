import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private isRefreshing = false;

  constructor(private auth: AuthService, private router: Router) {
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const token = this.auth.getToken();
    console.log('🧩 Guard attivato su route:', state.url);
    console.log('🔑 Token presente?', !!token);
    console.log('📦 Token (primi 30 char):', token?.slice(0, 30));

    if (!token) {
      console.warn('⛔ Nessun token trovato → reindirizzo a /auth');
      return of(this.router.createUrlTree(['/auth']));
    }

    const expired = this.auth.isTokenExpired();
    console.log('⏱ Token scaduto?', expired);

    if (expired) {
      if (this.isRefreshing) return of(false);
      this.isRefreshing = true;
      console.log('🔁 Token scaduto → provo refresh...');

      return this.auth.refreshToken().pipe(
        map(success => {
          this.isRefreshing = false;
          console.log('🔁 Refresh completato:', success);
          if (success) return true;
          console.warn('⚠️ Refresh fallito, redirect /auth');
          return this.router.createUrlTree(['/auth']);
        }),
        catchError(err => {
          console.error('💥 Errore refresh token:', err);
          this.isRefreshing = false;
          this.auth.logout();
          return of(this.router.createUrlTree(['/auth']));
        })
      );
    }

    console.log('✅ Token valido, accesso consentito');
    return of(true);
  }
}
