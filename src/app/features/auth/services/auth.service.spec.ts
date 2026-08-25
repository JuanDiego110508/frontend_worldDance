import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { firstValueFrom } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, TokenService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
        (service as any).useMock = false;

  });

  afterEach(() => {
    httpMock.verify();
  });

  it('El servicio debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('Debe iniciar sesión correctamente', async () => {
    const mockResponse = {
      token: 'mock-token-123',
      user: {
        id: 1,
        firstName: 'Juan',
        lastName: 'Pérez',
        documentNumber: '123456789',
        email: 'test@example.com',
        role: 'participant',
        active: true
      }
    };

    // Llamamos al servicio y guardamos la promesa
    const responsePromise = firstValueFrom(service.login('test@example.com', '123456'));

    // Interceptamos la petición HTTP
    const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
    expect(req.request.method).toBe('POST');
    
    // Respondemos con los datos simulados
    req.flush(mockResponse);

    // Esperamos la respuesta
    const response = await responsePromise;
    expect(response.token).toBe('mock-token-123');
    expect(response.user.email).toBe('test@example.com');
  });

  it('Debe registrar un usuario correctamente', async () => {
    const mockData = {
      firstName: 'Test',
      lastName: 'User',
      documentNumber: '123456789',
      email: 'test@example.com',
      password: '123456'
    };

    const mockResponse = {
      message: 'Usuario registrado exitosamente',
      userId: 1
    };

    const responsePromise = firstValueFrom(service.register(mockData));

    const req = httpMock.expectOne('http://localhost:8080/api/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    const response = await responsePromise;
    expect(response.message).toBe('Usuario registrado exitosamente');
    expect(response.userId).toBe(1);
  });

  it('Debe manejar error de login con credenciales incorrectas', async () => {
    const responsePromise = firstValueFrom(service.login('test@example.com', 'wrong'));

    const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
    req.flush({ message: 'Credenciales incorrectas' }, { status: 401, statusText: 'Unauthorized' });

    try {
      await responsePromise;
      // Si llegamos aquí, la prueba falla
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toBe('Credenciales incorrectas');
    }
  });

  it('Debe manejar error de registro con email duplicado', async () => {
    const mockData = {
      firstName: 'Test',
      lastName: 'User',
      documentNumber: '123456789',
      email: 'admin@worlddance.com',
      password: '123456'
    };

    const responsePromise = firstValueFrom(service.register(mockData));

    const req = httpMock.expectOne('http://localhost:8080/api/auth/register');
    req.flush({ message: 'El correo ya está registrado' }, { status: 400, statusText: 'Bad Request' });

    try {
      await responsePromise;
      // Si llegamos aquí, la prueba falla
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toBe('El correo ya está registrado');
    }
  });
});