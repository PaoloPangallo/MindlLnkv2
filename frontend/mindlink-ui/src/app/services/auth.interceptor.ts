import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, switchMap, catchError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    // ✅ Rotte pubbliche → non allegare token
    const isPublic =
      req.url.includes('/auth/login/') ||
      req.url.includes('/auth/register/') ||
      req.url.includes('/auth/refresh/');

    let authReq = req;

    if (token && !isPublic) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // 🔁 se 401 → tenta il refresh automatico, ma non per login/register
        if (error.status === 401 && !isPublic) {
          return this.auth.refreshToken().pipe(
            switchMap((success) => {
              if (success) {
                const newToken = this.auth.getToken();
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next.handle(retryReq);
              }
              return throwError(() => error);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
