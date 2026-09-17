import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnrollmentResponseDto, EnrollmentStatus, EventRole } from '../models/enrollment.interface';

export interface CreateEnrollmentRequest {
  userId: number;
  eventId: number;
  modalityId: number;
  roleInEvent: EventRole;
}

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/enrollments`;

  getEnrollments(eventId?: number): Observable<EnrollmentResponseDto[]> {
    if (eventId) {
      return this.http.get<EnrollmentResponseDto[]>(`${this.apiUrl}/event/${eventId}`);
    }
    // Si no hay eventId, el backend no expone un endpoint para listar TODAS las inscripciones.
    // Retornamos un arreglo vacío.
    return new Observable(subscriber => {
      subscriber.next([]);
      subscriber.complete();
    });
  }

  getMyEnrollments(): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.apiUrl}/my`);
  }

  getEnrollmentById(id: number): Observable<EnrollmentResponseDto> {
    return this.http.get<EnrollmentResponseDto>(`${this.apiUrl}/${id}`);
  }

  createEnrollment(data: CreateEnrollmentRequest): Observable<EnrollmentResponseDto> {
    return this.http.post<EnrollmentResponseDto>(`${this.apiUrl}/enrollment`, data);
  }

  getEnrollmentsByEvent(eventId: number): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.apiUrl}/event/${eventId}`);
  }

  getEnrollmentsByCategory(category: string): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.apiUrl}/category/${category}`);
  }

  getUserEventRole(eventId: number, userId: number): Observable<{ roleInEvent: EventRole }> {
    return this.http.get<{ roleInEvent: EventRole }>(`${this.apiUrl}/events/${eventId}/users/${userId}/role`);
  }

  updateEnrollmentStatus(id: number, status: EnrollmentStatus): Observable<EnrollmentResponseDto> {
    const payload = {
      enrollmentId: id,
      status: status,
      reason: status === 'REJECTED' ? 'Razón no especificada por el administrador' : null
    };
    return this.http.patch<EnrollmentResponseDto>(`${this.apiUrl}/approve`, payload);
  }
}
