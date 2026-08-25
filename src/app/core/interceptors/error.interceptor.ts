import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TokenService } from '../../features/auth/services/token.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private tokenService = inject(TokenService);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError(error => {
        let errorMessage = 'Ocurrió un error inesperado';

        if (error.status === 401) {
          /* Token expirado o inválido */
          this.tokenService.clearAll();
          this.router.navigate(['/auth/login'], { 
            queryParams: { sessionExpired: 'true' } 
          });
          errorMessage = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente';
        } else if (error.status === 403) {
          errorMessage = 'No tienes permisos para realizar esta acción';
        } else if (error.status === 404) {
          errorMessage = 'El recurso solicitado no existe';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        return throwError(() => ({ 
          status: error.status,
          message: errorMessage,
          details: error.error
        }));
      })
    );
  }
}