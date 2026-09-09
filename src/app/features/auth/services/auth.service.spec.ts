import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService, TokenService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('El servicio debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('Debe iniciar sesión correctamente y decodificar el userId/email del JWT', async () => {
    // Header + payload {"sub":"test@example.com","userId":1,"iat":0,"exp":9999999999} + firma dummy
    const fakeJwt =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ sub: 'test@example.com', userId: 1, iat: 0, exp: 9999999999 })) +
      '.signature';

    const responsePromise = firstValueFrom(service.login('test@example.com', 'password123'));

    const req = httpMock.expectOne('http://localhost:8080/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ data: { jwt: fakeJwt }, message: 'Inicio de sesión exitoso' });

    const user = await responsePromise;
    expect(user.id).toBe(1);
    expect(user.email).toBe('test@example.com');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('Debe rechazar el login cuando el backend responde 202 con data null', async () => {
    const responsePromise = firstValueFrom(service.login('test@example.com', 'wrongpass'));

    const req = httpMock.expectOne('http://localhost:8080/api/v1/auth/login');
    req.flush({ data: null, message: 'Correo o contraseña son incorrectos' });

    await expect(responsePromise).rejects.toThrow('Correo o contraseña son incorrectos');
  });

  it('Debe registrar un usuario correctamente', async () => {
    const mockData = {
      firstName: 'Test',
      lastName: 'User',
      documentNumber: '123456789',
      email: 'test@example.com',
      password: '12345678'
    };

    const responsePromise = firstValueFrom(service.register(mockData));

    const req = httpMock.expectOne('http://localhost:8080/api/v1/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      documentNumber: '123456789',
      email: 'test@example.com',
      active: true,
      message: 'Usuario registrado exitosamente'
    });

    const response = await responsePromise;
    expect(response.message).toBe('Usuario registrado exitosamente');
    expect(response.id).toBe(1);
  });

  it('Debe manejar error de registro con email duplicado', async () => {
    const mockData = {
      firstName: 'Test',
      lastName: 'User',
      documentNumber: '123456789',
      email: 'admin@worlddance.com',
      password: '12345678'
    };

    const responsePromise = firstValueFrom(service.register(mockData));

    const req = httpMock.expectOne('http://localhost:8080/api/v1/auth/register');
    req.flush({ message: 'El correo ya se encuentra registrado' }, { status: 400, statusText: 'Bad Request' });

    await expect(responsePromise).rejects.toThrow('El correo ya se encuentra registrado');
  });
});
