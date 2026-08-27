import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError, delay } from 'rxjs/operators';
import { TokenService } from './token.service';
import { environment } from '../../../../enviroments/enviroment';

/* Interfaz User - todos los campos son obligatorios */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  documentNumber: string;
  email: string;
  role: string;
  active: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  documentNumber: string;
  email: string;
  password: string;
}

export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  documentNumber: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  
  private apiUrl = environment.apiUrl + '/auth';
  private useMock = true;

  private forceAuthenticated = true;

  login(email: string, password: string): Observable<LoginResponse> {
    if (this.useMock) {
      return this.mockLogin(email, password);
    }
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          this.tokenService.setToken(response.token);
          this.tokenService.setUser(response.user);
        }),
        catchError(error => {
          return throwError(() => error.error || { message: 'Error al iniciar sesión' });
        })
      );
  }

  register(data: RegisterData): Observable<any> {
    if (this.useMock) {
      return this.mockRegister(data);
    }
    
    return this.http.post(`${this.apiUrl}/register`, data)
      .pipe(
        catchError(error => {
          return throwError(() => error.error || { message: 'Error en el registro' });
        })
      );
  }

  requestPasswordReset(email: string): Observable<any> {
    if (this.useMock) {
      return this.mockRequestPasswordReset(email);
    }
    
    return this.http.post(`${this.apiUrl}/forgot-password`, { email })
      .pipe(
        catchError(error => {
          return throwError(() => error.error || { message: 'Error al enviar el correo' });
        })
      );
  }

  updateProfile(data: UpdateProfileData): Observable<any> {
    if (this.useMock) {
      return this.mockUpdateProfile(data);
    }
    
    return this.http.put(`${this.apiUrl}/profile`, data)
      .pipe(
        catchError(error => {
          return throwError(() => error.error || { message: 'Error al actualizar el perfil' });
        })
      );
  }

  logout(): void {
    this.tokenService.clearAll();
  }

  isAuthenticated(): boolean {
    return this.tokenService.hasToken();
  }

  getCurrentUser(): User | null {
     if (this.forceAuthenticated && !this.tokenService.getToken()) {
      const mockUser: User = {
        id: 1,
        firstName: 'Juan',
        lastName: 'Pérez',
        documentNumber: '123456789',
        email: 'juan@ejemplo.com',
        role: 'organizer',  // Cambia a 'participant' o 'admin' según necesites
        active: true
      };
      return mockUser;
    }
    const token = this.tokenService.getToken();
    if (token) {
      return this.tokenService.decodeToken(token);
    }
    return null;
  }

  getToken(): string | null {
    return this.tokenService.getToken();
  }

  /* MOCKS */

  private mockLogin(email: string, password: string): Observable<LoginResponse> {
    const mockUser: User = {
      id: 1,
      firstName: 'Juan',
      lastName: 'Pérez',
      documentNumber: '123456789',
      email: email,
      role: 'organizer',
      active: true
    };

    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
      btoa(JSON.stringify(mockUser)) + 
      '.mock-signature';

    if (password.length < 6) {
      return throwError(() => ({ message: 'Contraseña incorrecta' }));
    }

    this.tokenService.setToken(mockToken);
    this.tokenService.setUser(mockUser);

    return of({
      token: mockToken,
      user: mockUser
    }).pipe(delay(800));
  }

  private mockRegister(data: RegisterData): Observable<any> {
    if (data.email === 'admin@worlddance.com') {
      return throwError(() => ({ message: 'El correo ya está registrado' }));
    }

    return of({
      message: 'Usuario registrado exitosamente',
      userId: 1
    }).pipe(delay(1000));
  }

  private mockRequestPasswordReset(email: string): Observable<any> {
    return of({
      message: 'Correo de recuperación enviado'
    }).pipe(delay(800));
  }

  private mockUpdateProfile(data: UpdateProfileData): Observable<any> {
    const currentUser = this.getCurrentUser();
    
    /* Asegurar que currentUser no sea null y tenga todos los campos */
    const userWithDefaults: User = {
      id: currentUser?.id || 1,
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      documentNumber: currentUser?.documentNumber || '',
      email: currentUser?.email || '',
      role: currentUser?.role || 'organizer',
      active: currentUser?.active ?? true
    };

    /* Crear el usuario actualizado con los nuevos datos */
    const updatedUser: User = {
      ...userWithDefaults,
      firstName: data.firstName || userWithDefaults.firstName,
      lastName: data.lastName || userWithDefaults.lastName,
      documentNumber: data.documentNumber || userWithDefaults.documentNumber,
      email: data.email || userWithDefaults.email
    };

    return of({
      message: 'Perfil actualizado correctamente',
      user: updatedUser
    }).pipe(
      delay(1000),
      tap(() => {
        const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
          btoa(JSON.stringify(updatedUser)) + 
          '.mock-signature-updated';
        this.tokenService.setToken(newToken);
        this.tokenService.setUser(updatedUser);
      })
    );
  }
}