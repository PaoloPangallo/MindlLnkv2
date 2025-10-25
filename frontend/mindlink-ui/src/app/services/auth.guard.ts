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

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const token = this.auth.getToken();

    // 🔹 Caso 1: Nessun token → reindirizza subito al login
    if (!token) {
      return of(this.router.createUrlTree(['/auth']));
    }

    // 🔹 Caso 2: Token scaduto → tenta refresh silenzioso
    if (this.auth.isTokenExpired()) {
      if (this.isRefreshing) {
        // Previene doppio refresh se due route scattano insieme
        return of(false);
      }

      this.isRefreshing = true;
      return this.auth.refreshToken().pipe(
        map((success) => {
          this.isRefreshing = false;
          if (success) {
            console.info('🔁 Token aggiornato automaticamente.');
            return true;
          }
          console.warn('⚠️ Refresh fallito. Redireziono al login.');
          return this.router.createUrlTree(['/auth']);
        }),
        catchError(() => {
          this.isRefreshing = false;
          this.auth.logout();
          return of(this.router.createUrlTree(['/auth']));
        })
      );
    }

    // 🔹 Caso 3: Token valido → accesso consentito
    return of(true);
  }
}
