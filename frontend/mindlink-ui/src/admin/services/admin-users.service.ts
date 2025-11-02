import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {environment} from "../../environments/environment";

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  idea_count: number;
  date_joined: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private apiUrl = `${environment.apiUrl}/admin/users/`;

  constructor(private http: HttpClient) {}

  /** 🔹 Recupera tutti gli utenti */
  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /** 🔹 Bannare / sbloccare un utente */
  toggleUser(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}${id}/toggle/`, {}).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('❌ Errore AdminUsersService:', error);
    return throwError(() => new Error(error.error?.message || 'Errore generico.'));
  }
}
