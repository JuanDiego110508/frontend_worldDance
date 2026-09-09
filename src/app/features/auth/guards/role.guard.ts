import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * ms-auth-identityservice no expone el rol del usuario (ni en el JWT ni en ningún endpoint
 * de perfil accesible por el propio usuario), así que hoy no existe forma de verificar
 * `requiredRoles` contra un dato real. Mientras el backend no incluya el rol en la sesión,
 * cualquier ruta que declare `data: { roles: [...] }` se deniega por seguridad (fail-safe)
 * en vez de dejar pasar a todos los usuarios autenticados.
 */
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles = route.data['roles'] as string[] | undefined;

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!this.authService.getCurrentUser()) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    this.router.navigate(['/']);
    return false;
  }
}
