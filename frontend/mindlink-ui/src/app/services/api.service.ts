// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {environment} from "../../environments/environment";
import {Idea} from "../models/idea.model";
import {Connection} from "../models/connection.model";
import {SimilarIdea} from "../models/similar-idea.model";

// === INTERFACCE ===


// === SERVIZIO PRINCIPALE ===
@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl || '/api';

  constructor(private http: HttpClient) {}

  // =====================================================
  // 🔹 IDEAS CRUD
  // =====================================================
  getIdeas(): Observable<Idea[]> {
    return this.http.get<Idea[]>(`${this.baseUrl}/ideas/`).pipe(catchError(this.handleError));
  }

  getIdea(id: number): Observable<Idea> {
    return this.http.get<Idea>(`${this.baseUrl}/ideas/${id}/`).pipe(catchError(this.handleError));
  }

  createIdea(idea: Partial<Idea>): Observable<Idea> {
    return this.http.post<Idea>(`${this.baseUrl}/ideas/`, idea).pipe(catchError(this.handleError));
  }

  updateIdea(id: number, idea: Partial<Idea>): Observable<Idea> {
    return this.http.patch<Idea>(`${this.baseUrl}/ideas/${id}/`, idea).pipe(catchError(this.handleError));
  }

  deleteIdea(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/ideas/${id}/`).pipe(catchError(this.handleError));
  }

  // =====================================================
  // 🔹 CONNECTIONS CRUD
  // =====================================================
  getConnections(): Observable<Connection[]> {
    return this.http.get<Connection[]>(`${this.baseUrl}/connections/`).pipe(catchError(this.handleError));
  }

  createConnection(conn: Partial<Connection>): Observable<Connection> {
    return this.http.post<Connection>(`${this.baseUrl}/connections/`, conn).pipe(catchError(this.handleError));
  }

  updateConnection(id: number, conn: Partial<Connection>): Observable<Connection> {
    return this.http.patch<Connection>(`${this.baseUrl}/connections/${id}/`, conn).pipe(catchError(this.handleError));
  }

  deleteConnection(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/connections/${id}/`).pipe(catchError(this.handleError));
  }

  recalculateSemanticWeights(): Observable<any> {
    return this.http.post(`${this.baseUrl}/connections/auto_weight/`, {}).pipe(catchError(this.handleError));
  }

  // =====================================================
  // 🔹 AI ENDPOINTS
  // =====================================================
  findSimilarIdeas(text: string, top_k: number = 5, min_threshold: number = 0.5): Observable<{ results: SimilarIdea[] }> {
    const payload = { text, top_k, min_threshold };
    return this.http.post<{ results: SimilarIdea[] }>(
      `${this.baseUrl}/similar/`, // ✅ endpoint globale (non più sotto /ideas/)
      payload
    ).pipe(catchError(this.handleError));
  }

  analyzeIdea(payload: { id?: number; text?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/analyze/`, payload).pipe(catchError(this.handleError));
  }

  refreshAnalysis(): Observable<any> {
    return this.http.post(`${this.baseUrl}/refresh/`, {}).pipe(catchError(this.handleError));
  }

  getMap(): Observable<any> {
    return this.http.get(`${this.baseUrl}/map/`).pipe(catchError(this.handleError));
  }

  // =====================================================
  // 🔹 ERRORE GLOBALE
  // =====================================================
  private handleError(error: HttpErrorResponse) {
    console.error('❌ API Error:', error);
    let message = 'Errore di connessione al server.';
    if (error.status === 0) message = 'Server non raggiungibile.';
    else if (error.error?.error) message = error.error.error;
    else if (error.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }
}
