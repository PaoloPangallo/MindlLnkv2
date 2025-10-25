import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, switchMap, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();
    const isPublic =
      req.url.includes('/auth/login/') ||
      req.url.includes('/auth/register/') ||
      req.url.includes('/auth/refresh/');

    let authReq = req;
    if (token && !isPublic) {
      authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !isPublic && !this.isRefreshing) {
          this.isRefreshing = true;
          return this.auth.refreshToken().pipe(
            switchMap(success => {
              this.isRefreshing = false;
              if (success) {
                const newToken = this.auth.getToken();
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next.handle(retryReq);
              }
              this.auth.logout();
              return throwError(() => error);
            }),
            catchError(err => {
              this.isRefreshing = false;
              this.auth.logout();
              return throwError(() => err);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
