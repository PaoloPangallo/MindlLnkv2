import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Idea {
  id?: number;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  keywords?: string[];
  created_at?: string;
}

export interface Connection {
  id?: number;
  source: number;
  target: number;
  type?: string;
  strength?: number;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '/api'; // Proxy handle → Django backend

  constructor(private http: HttpClient) {}

  // === IDEAS ===
  getIdeas(): Observable<Idea[]> {
    return this.http.get<Idea[]>(`${this.baseUrl}/ideas/`);
  }

  createIdea(idea: Partial<Idea>): Observable<Idea> {
    return this.http.post<Idea>(`${this.baseUrl}/ideas/`, idea);
  }

  // === CONNECTIONS ===
  getConnections(): Observable<Connection[]> {
    return this.http.get<Connection[]>(`${this.baseUrl}/connections/`);
  }

  createConnection(conn: Partial<Connection>): Observable<Connection> {
    return this.http.post<Connection>(`${this.baseUrl}/connections/`, conn);
  }

  // === AI ENDPOINTS ===
  analyzeIdea(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/analyze/`, payload);
  }

  refreshAnalysis(): Observable<any> {
    return this.http.post(`${this.baseUrl}/refresh/`, {});
  }

  getMap(): Observable<any> {
    return this.http.get(`${this.baseUrl}/map/`);
  }
}
