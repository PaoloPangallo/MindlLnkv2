import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private apiUrl = '/api/training/start/';

  constructor(private http: HttpClient) {}

  startTraining(): Observable<any> {
    return this.http.post(this.apiUrl, {});
  }
}
