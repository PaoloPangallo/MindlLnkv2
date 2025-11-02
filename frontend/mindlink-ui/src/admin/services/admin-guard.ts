import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import {AuthService} from "../../app/services/auth.service";

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    const user = this.auth.currentUser; // ✅ allineato al tuo servizio
    const isAdmin = user?.isAdmin === true;

    console.log('🧩 AdminGuard → utente:', user?.username || 'anonimo');
    console.log('👑 Permessi admin?', isAdmin);

    if (isAdmin) {
      return of(true);
    } else {
      console.warn('⛔ Accesso negato: non sei admin → redirect /');
      return of(this.router.createUrlTree(['/']));
    }
  }
}
