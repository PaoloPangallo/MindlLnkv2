import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import {AuthService} from "./auth.service";

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const token = this.auth.getToken();

    // 🔹 Caso 1: utente non loggato
    if (!token) {
      return of(this.router.createUrlTree(['/auth']));
    }

    // 🔹 Caso 2: token scaduto → tenta refresh silenzioso
    if (this.auth.isTokenExpired()) {
      return new Observable((observer) => {
        this.auth.refreshToken().subscribe({
          next: (success) => {
            if (success) {
              observer.next(true);
            } else {
              observer.next(this.router.createUrlTree(['/auth']));
            }
            observer.complete();
          },
          error: () => {
            observer.next(this.router.createUrlTree(['/auth']));
            observer.complete();
          }
        });
      });
    }

    // 🔹 Caso 3: token valido → consenti l’accesso
    return of(true);
  }
}
