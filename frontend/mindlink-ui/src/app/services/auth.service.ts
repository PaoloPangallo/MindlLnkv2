import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private accessKey = 'access_token';
  private refreshKey = 'refresh_token';
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {
    const token = localStorage.getItem(this.accessKey);
    if (token && !this.isTokenExpired()) {
      this.currentUserSubject.next(this.parseToken(token));
    }
  }

  /** 🔹 Login */
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login/`, { username, password }).pipe(
      tap((res: any) => this.handleAuthResponse(res)),
      catchError(err => throwError(() => this.formatError(err)))
    );
  }

  /** 🔹 Registrazione */
  register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, { username, password }).pipe(
      tap((res: any) => this.handleAuthResponse(res)),
      catchError(err => throwError(() => this.formatError(err)))
    );
  }

  /** 🔹 Refresh token */
  refreshToken(): Observable<boolean> {
    const refresh = localStorage.getItem(this.refreshKey);
    if (!refresh) return of(false);

    return this.http.post(`${this.apiUrl}/refresh/`, { refresh }).pipe(
      tap((res: any) => {
        if (res.access) {
          localStorage.setItem(this.accessKey, res.access);
        }
      }),
      switchMap(() => of(true)),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  /** 🔹 Logout */
  logout(): void {
    localStorage.removeItem(this.accessKey);
    localStorage.removeItem(this.refreshKey);
    this.currentUserSubject.next(null);
  }

  /** 🔹 Stato login */
  get currentUser$(): Observable<any> {
    return this.currentUserSubject.asObservable();
  }

  get currentUser(): any {
    return this.currentUserSubject.value;
  }

  /** 🔹 Token correnti */
  getToken(): string | null {
    return localStorage.getItem(this.accessKey);
  }

  /** 🔹 Parsing JWT */
  private parseToken(token: string): any {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        username: payload.username || payload.user,
        id: payload.user_id,
        exp: payload.exp
      };
    } catch {
      return null;
    }
  }

  /** 🔹 Verifica scadenza */
  isTokenExpired(): boolean {
    const token = localStorage.getItem(this.accessKey);
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  /** 🔹 Gestione login/register response */
  private handleAuthResponse(res: any): void {
    localStorage.setItem(this.accessKey, res.access);
    localStorage.setItem(this.refreshKey, res.refresh);
    this.currentUserSubject.next(this.parseToken(res.access));
  }

  /** 🔹 Formattazione errore */
  private formatError(error: any): string {
    if (error.error?.detail) return error.error.detail;
    if (error.status === 401) return 'Credenziali non valide.';
    if (error.status === 0) return 'Server non raggiungibile.';
    return 'Errore sconosciuto.';
  }
}
