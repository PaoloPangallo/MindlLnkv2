import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';
  private accessKey = 'access_token';
  private refreshKey = 'refresh_token';
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {
    const token = localStorage.getItem(this.accessKey);
    if (token) {
      this.currentUserSubject.next(this.parseToken(token));
    }
  }

  /** 🔹 Login utente */
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login/`, { username, password }).pipe(
      tap((res: any) => {
        localStorage.setItem(this.accessKey, res.access);
        localStorage.setItem(this.refreshKey, res.refresh);
        this.currentUserSubject.next(this.parseToken(res.access));
      })
    );
  }

  /** 🔹 Registrazione */
  register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, { username, password }).pipe(
      tap((res: any) => {
        localStorage.setItem(this.accessKey, res.access);
        localStorage.setItem(this.refreshKey, res.refresh);
        this.currentUserSubject.next(this.parseToken(res.access));
      })
    );
  }

  /** 🔹 Refresh token (silenzioso) */
  refreshToken(): Observable<boolean> {
    const refresh = localStorage.getItem(this.refreshKey);
    if (!refresh) return of(false);

    return this.http.post(`${this.apiUrl}/refresh/`, { refresh }).pipe(
      tap((res: any) => {
        localStorage.setItem(this.accessKey, res.access);
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

  /** 🔹 Recupera token corrente */
  getToken(): string | null {
    return localStorage.getItem(this.accessKey);
  }

  /** 🔹 Stato login come Observable */
  get currentUser$(): Observable<any> {
    return this.currentUserSubject.asObservable();
  }

  /** 🔹 Utente corrente */
  get currentUser(): any {
    return this.currentUserSubject.value;
  }

  /** 🔹 Parsing payload JWT */
  private parseToken(token: string): any {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { username: payload.username, id: payload.user_id, exp: payload.exp };
    } catch {
      return null;
    }
  }

  /** 🔹 Verifica scadenza token */
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
}
