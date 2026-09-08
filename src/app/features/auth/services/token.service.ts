import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../../../core/models/user.model';

/** Claims reales emitidas por JwtService en ms-auth-identityservice: sin nombre ni rol. */
export interface JwtClaims {
  sub: string;
  userId: number;
  iat: number;
  exp: number;
}

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'wd_access_token';
  private readonly USER_KEY = 'wd_user_data';
  private readonly platformId = inject(PLATFORM_ID);

  setToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  getToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem(this.TOKEN_KEY) : null;
  }

  removeToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  /** Verifica presencia Y vigencia (claim `exp`) del token, no solo su existencia. */
  hasToken(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const claims = this.decodeToken(token);
    if (!claims?.exp) return false;
    return claims.exp * 1000 > Date.now();
  }

  decodeToken(token: string): JwtClaims | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload)) as JwtClaims;
    } catch {
      return null;
    }
  }

  getUser(): User | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const data = localStorage.getItem(this.USER_KEY);
    return data ? (JSON.parse(data) as User) : null;
  }

  setUser(user: User): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  clearAll(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }
}
