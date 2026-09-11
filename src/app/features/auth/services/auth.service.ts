import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, delay, map, of, tap, throwError } from 'rxjs';
import { TokenService } from './token.service';
import { environment } from '../../../../environments/environment';
import { User } from '../../../core/models/user.model';
import {
  HttpGlobalResponse,
  JwtDto,
  RegisterRequest,
  RegisterResponse,
  UpdateUserRequest
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly apiUrl = environment.apiUrl;

  private readonly authStatus = new BehaviorSubject<boolean>(this.isAuthenticated());
  readonly authStatus$ = this.authStatus.asObservable();

  /**
   * El login real (POST /auth/login) responde 202 con { data: { jwt } | null, message }.
   * `data` es null cuando el usuario no existe o la contraseña es incorrecta, aunque el status HTTP sea 202.
   */
  login(email: string, password: string): Observable<User> {
    return this.http.post<HttpGlobalResponse<JwtDto | null>>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      map(res => {
        if (!res.data?.jwt) {
          throw new Error(res.message || 'Correo o contraseña incorrectos');
        }
        if (res.data.user) {
          this.tokenService.setUser(res.data.user);
        }
        return res.data.jwt;
      }),
      tap(jwt => {
        this.tokenService.setToken(jwt);
        this.authStatus.next(true);
      }),
      map(() => {
        const user = this.getCurrentUser();
        if (!user) {
          throw new Error('No fue posible leer los datos de la sesión.');
        }
        return user;
      }),
      catchError(err => this.handleError(err))
    );
  }

  /** El registro (POST /auth/register) no autentica: devuelve los datos creados, sin JWT. */
  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /**
   * ms-auth-identityservice no expone ningún endpoint de recuperación de contraseña.
   * Se mantiene como flujo simulado hasta que el backend lo implemente.
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    return of({ message: 'Si el correo existe en nuestro sistema, se enviará un enlace de recuperación.' }).pipe(
      delay(600)
    );
  }

  /** PUT /users/update real; cachea localmente el resultado porque no existe un endpoint /me. */
  updateUser(data: UpdateUserRequest): Observable<UpdateUserRequest> {
    return this.http.put<UpdateUserRequest>(`${this.apiUrl}/users/update`, data).pipe(
      tap(updated => this.tokenService.setUser({ ...updated })),
      catchError(err => this.handleError(err))
    );
  }

  logout(): void {
    this.tokenService.clearAll();
    this.authStatus.next(false);
  }

  isAuthenticated(): boolean {
    return this.tokenService.hasToken();
  }

  /**
   * El JWT solo lleva `userId` y `email` (claim `sub`); no incluye nombre ni rol.
   * Si ya guardamos un perfil completo (tras registro/actualización) para ese mismo correo, se reutiliza.
   */
  getCurrentUser(): User | null {
    const token = this.tokenService.getToken();
    if (!token) return null;

    const claims = this.tokenService.decodeToken(token);
    if (!claims?.userId) return null;

    const cached = this.tokenService.getUser();
    if (cached && cached.email === claims.sub) {
      return cached;
    }

    return {
      id: claims.userId,
      email: claims.sub ?? '',
      firstName: '',
      lastName: '',
      documentNumber: '',
      active: true
    };
  }

  getToken(): string | null {
    return this.tokenService.getToken();
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.message ?? 'Ocurrió un error de comunicación con el servidor.';
    return throwError(() => new Error(message));
  }
}
