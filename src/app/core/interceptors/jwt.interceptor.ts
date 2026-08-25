import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from '../../features/auth/services/token.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private tokenService = inject(TokenService);

  /* Esta función se ejecuta antes de cada petición HTTP.
     Si tenemos un token guardado, lo agrega automáticamente en el header Authorization */
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.tokenService.getToken();
    
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(request);
  }
}