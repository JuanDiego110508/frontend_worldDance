import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { TokenService } from '../../features/auth/services/token.service';

/** Traduce errores HTTP a mensajes en español y cierra la sesión si el token expiró. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  const handle = (error: HttpErrorResponse) => {
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
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      /* Cuando la petición pide `responseType: 'blob'` (p. ej. descarga de música o exportes de
         reportes), Angular entrega el cuerpo del error como un Blob en vez de JSON parseado. Si no
         se reconstruye aquí, se pierde el mensaje real del backend y todo cae al mensaje genérico. */
      if (error.error instanceof Blob && error.error.type?.includes('json')) {
        return from(error.error.text()).pipe(
          switchMap(text => {
            let parsedBody: unknown = text;
            try {
              parsedBody = JSON.parse(text);
            } catch {
              /* el cuerpo no era JSON válido; se conserva el texto crudo */
            }
            return handle(new HttpErrorResponse({
              error: parsedBody,
              headers: error.headers,
              status: error.status,
              statusText: error.statusText,
              url: error.url ?? undefined
            }));
          })
        );
      }

      return handle(error);
    })
  );
};
