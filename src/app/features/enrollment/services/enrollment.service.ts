import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Enrollment, EnrollmentStatus } from '../models/enrollment.interface';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/enrollment';
  private useMock = true;

  /* Obtener todas las inscripciones (organizador) */
  getEnrollments(eventId?: number): Observable<Enrollment[]> {
    if (this.useMock) {
      return of(this.mockEnrollments()).pipe(delay(500));
    }
    const url = eventId ? `${this.apiUrl}?eventId=${eventId}` : this.apiUrl;
    return this.http.get<Enrollment[]>(url);
  }

  /* Obtener inscripciones de un usuario (participante) */
  getMyEnrollments(userId: number): Observable<Enrollment[]> {
    if (this.useMock) {
      return of(this.mockEnrollments().filter(e => e.participantId === userId)).pipe(delay(500));
    }
    return this.http.get<Enrollment[]>(`${this.apiUrl}/user/${userId}`);
  }

  /* Obtener una inscripción por ID */
  getEnrollmentById(id: number): Observable<Enrollment> {
    if (this.useMock) {
      const enrollment = this.mockEnrollments().find(e => e.id === id);
      return of(enrollment || this.mockEnrollments()[0]).pipe(delay(300));
    }
    return this.http.get<Enrollment>(`${this.apiUrl}/${id}`);
  }

  /* Crear una nueva inscripción */
  createEnrollment(data: Omit<Enrollment, 'id' | 'createdAt' | 'status'>): Observable<Enrollment> {
    if (this.useMock) {
      const newEnrollment: Enrollment = {
        id: Math.floor(Math.random() * 1000),
        ...data,
        status: 'PENDING',
        createdAt: new Date()
      };
      return of(newEnrollment).pipe(delay(800));
    }
    return this.http.post<Enrollment>(this.apiUrl, data);
  }

  /* Actualizar el estado de una inscripción (organizador) */
  updateEnrollmentStatus(id: number, status: EnrollmentStatus): Observable<Enrollment> {
    if (this.useMock) {
      const enrollment = this.mockEnrollments().find(e => e.id === id);
      const updated = { ...enrollment, status } as Enrollment;
      return of(updated).pipe(delay(600));
    }
    return this.http.patch<Enrollment>(`${this.apiUrl}/${id}/status`, { status });
  }

  /* Eliminar una inscripción */
  deleteEnrollment(id: number): Observable<void> {
    if (this.useMock) {
      return of(void 0).pipe(delay(500));
    }
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private mockEnrollments(): Enrollment[] {
    return [
      { id: 1, participantId: 1, categoryId: 1, categoryName: 'Danza Contemporánea', eventId: 1, eventName: 'Festival de Danza 2026', status: 'PENDING', createdAt: new Date('2026-08-20') },
      { id: 2, participantId: 2, categoryId: 2, categoryName: 'Ballet', eventId: 1, eventName: 'Festival de Danza 2026', status: 'APPROVED', createdAt: new Date('2026-08-19') },
      { id: 3, participantId: 3, categoryId: 3, categoryName: 'Folclor', eventId: 1, eventName: 'Festival de Danza 2026', status: 'REJECTED', createdAt: new Date('2026-08-18') }
    ];
  }
}