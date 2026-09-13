import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '../../features/auth/services/token.service';

/** Traduce errores HTTP a mensajes en español y cierra la sesión si el token expiró. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Ocurrió un error inesperado.';

      if (error.status === 401) {
        /* Solo se considera "sesión expirada" si había un token guardado. Una petición anónima
           (p. ej. el navbar consultando streams en vivo sin sesión) no debe expulsar al usuario
           de la página pública en la que está. */
        const hadToken = !!tokenService.getToken();
        tokenService.clearAll();
        if (hadToken) {
          router.navigate(['/auth/login'], { queryParams: { sessionExpired: 'true' } });
          message = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
        } else {
          message = 'No tienes autorización para realizar esta acción.';
        }
      } else if (error.status === 403) {
        message = 'No tienes permisos para realizar esta acción.';
      } else if (error.status === 404) {
        message = 'El recurso solicitado no existe.';
      } else if (error.status === 0) {
        message = 'No fue posible contactar al servidor.';
      } else if (error.status >= 500) {
        message = 'Error interno del servidor.';
      } else if (typeof error.error === 'string' && error.error) {
        message = error.error;
      } else if (error.error?.message) {
        message = error.error.message;
      }

      return throwError(() => Object.assign(new Error(message), { status: error.status }));
    })
  );
};
