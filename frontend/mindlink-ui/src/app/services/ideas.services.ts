import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpParams} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** 🔹 Interfacce base */
export interface Idea {
  id: number;
  title: string;
  content: string;
  category?: string;
  summary?: string;
  keywords?: string[];
  created_at?: string;
}

export interface InsightData {
  total_ideas: number;
  categories: { category: string; count: number }[];
  top_keywords: string[];
}

@Injectable({ providedIn: 'root' })
export class IdeasService {
  private baseUrl = `${environment.apiUrl}/ideas`;

  constructor(private http: HttpClient) {}

  /** 🟢 1. Ottiene tutte le idee dell’utente corrente */
  getMyIdeas(): Observable<Idea[]> {
    return this.http.get<Idea[]>(`${this.baseUrl}/mine/`).pipe(
      catchError(this.handleError)
    );
  }

  /** 🧩 2. Trova idee correlate a una specifica idea */
  getRelatedIdeas(id: number | undefined, weights?: {
    cosine?: number;
    keywords?: number;
    category?: number
  }): Observable<any> {
  let params = new HttpParams();
  if (weights) {
    Object.entries(weights).forEach(([key, val]) => {
      if (val !== undefined) params = params.set(key, val.toString());
    });
  }

  return this.http.get(`${this.baseUrl}/${id}/related/`, { params });
}


  /** 📊 3. Recupera statistiche e insight */
  getInsights(): Observable<InsightData> {
    return this.http.get<InsightData>(`${this.baseUrl}/insights/`).pipe(
      catchError(this.handleError)
    );
  }

  /** 🧠 4. Analizza un’idea specifica o un testo */
  analyzeIdea(data: { id?: number; text?: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/analyze/`, data).pipe(
      catchError(this.handleError)
    );
  }

  /** 🗺️ 5. Recupera il grafo personale dell’utente */
  getUserMap(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/ideas/map/self/`).pipe(
      catchError(this.handleError)
    );
  }

  // =====================================================
  // ⚠️ Error handling comune
  // =====================================================
  private handleError(error: HttpErrorResponse) {
    console.error('❌ Errore API IdeasService:', error);
    const message = error.error?.message || 'Errore durante la richiesta.';
    return throwError(() => new Error(message));
  }






}
