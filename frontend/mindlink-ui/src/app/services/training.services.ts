// src/app/services/training.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private apiUrl = `${environment.apiUrl}/training/start/`; // ✅ allineato con Django backend

  constructor(private http: HttpClient) {}

  /** 🔹 Avvia manualmente il training istantaneo (solo admin) */
  startTraining(): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(this.apiUrl, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Errore avvio training:', error);
        return throwError(() => new Error(error.error?.message || 'Errore durante il training.'));
      })
    );
  }
}
