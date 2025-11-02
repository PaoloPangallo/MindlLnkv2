import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private accessKey = 'access_token';
  private refreshKey = 'refresh_token';
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService
  ) {
    const token = localStorage.getItem(this.accessKey);

    if (token) {
      if (this.isTokenExpired()) {
        this.refreshToken().subscribe();
      } else {
        this.currentUserSubject.next(this.parseToken(token));
        this.applySavedTheme(); // 👈 applica tema salvato localmente
      }
    }

    // 🔁 Auto-refresh ogni 15 minuti
    setInterval(() => {
      const token = localStorage.getItem(this.accessKey);
      if (token && !this.isTokenExpired()) {
        console.log('🔄 Refresh periodico token...');
        this.refreshToken().subscribe();
      }
    }, 15 * 60 * 1000);
  }

  // ============================================================
  // 🔹 LOGIN / REGISTER
  // ============================================================

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login/`, { username, password }).pipe(
      tap(res => this.handleAuthResponse(res)),

      // 🔹 Dopo il login → carica impostazioni utente e applica tema
      switchMap(() => this.settingsService.getUserSettings().pipe(
        tap(data => {
          const theme = data?.preferences?.appearance?.theme || 'dark';
          document.body.setAttribute('data-theme', theme);
          localStorage.setItem('user_theme', theme);
          console.log('🎨 Tema applicato:', theme);
        }),
        catchError(err => {
          console.warn('⚠️ Nessuna impostazione trovata o errore:', err);
          document.body.setAttribute('data-theme', 'dark');
          return of(null);
        })
      )),

      catchError(err => throwError(() => this.formatError(err)))
    );
  }

  register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, { username, password }).pipe(
      tap(res => this.handleAuthResponse(res)),
      catchError(err => throwError(() => this.formatError(err)))
    );
  }

  // ============================================================
  // 🔹 REFRESH TOKEN
  // ============================================================

  refreshToken(): Observable<boolean> {
    const refresh = localStorage.getItem(this.refreshKey);
    if (!refresh) return of(false);

    console.log('🔍 Tentativo di refresh token...');
    return this.http.post(`${this.apiUrl}/refresh/`, { refresh }).pipe(
      tap((res: any) => {
        if (res.access) {
          console.info('🟢 Token aggiornato');
          localStorage.setItem(this.accessKey, res.access);
          this.currentUserSubject.next(this.parseToken(res.access));
        }
      }),
      switchMap(() => of(true)),
      catchError(err => {
        console.error('❌ Refresh fallito:', err);
        this.logout();
        return of(false);
      })
    );
  }

  // ============================================================
  // 🔹 LOGOUT / UTILITIES
  // ============================================================

  logout(): void {
    localStorage.removeItem(this.accessKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem('user_theme');
    this.currentUserSubject.next(null);
    document.body.removeAttribute('data-theme');
  }

  get currentUser$(): Observable<any> {
    return this.currentUserSubject.asObservable();
  }

  get currentUser(): any {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.accessKey);
  }

  // ============================================================
  // 🔹 TOKEN & PARSING
  // ============================================================

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

  private parseToken(token: string): any {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        username: payload.username || payload.user,
        id: payload.user_id,
        exp: payload.exp,
        isAdmin: payload.is_admin || false
      };
    } catch {
      return null;
    }
  }

  private handleAuthResponse(res: any): void {
    localStorage.setItem(this.accessKey, res.access);
    localStorage.setItem(this.refreshKey, res.refresh);
    this.currentUserSubject.next(this.parseToken(res.access));
  }

  // ============================================================
  // 🔹 ERROR HANDLING
  // ============================================================

  private formatError(error: any): string {
    if (error.error?.detail) return error.error.detail;
    if (error.status === 401) return 'Credenziali non valide.';
    if (error.status === 0) return 'Server non raggiungibile.';
    return 'Errore sconosciuto.';
  }

  // ============================================================
  // 🔹 THEME MANAGEMENT
  // ============================================================

  private applySavedTheme(): void {
    const savedTheme = localStorage.getItem('user_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
  }

  get currentUserValue() {
    return this.currentUserSubject?.value || this.currentUser;
  }
}
