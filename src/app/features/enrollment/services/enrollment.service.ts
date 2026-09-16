import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { EnrollmentResponseDto, EnrollmentStatus, EventRole } from '../models/enrollment.interface';

export interface CreateEnrollmentRequest {
  userId: number;
  eventId: number;
  modalityId: number;
  roleInEvent: EventRole;
}

export interface UserEventRoleResponseDto {
  id: number;
  userId: number;
  eventId: number;
  roleInEvent: EventRole;
}

import { environment } from '../../../../environments/environment';

/**
 * Rutas alineadas con EnrollmentController (ms-enrollment), montado en el gateway
 * bajo /api/v1/enrollments/** (plural). No es un CRUD genérico: cada endpoint tiene
 * un path literal propio (no hay GET /enrollments/{id} ni filtros por query string).
 */
@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/enrollments`;

  /** POST /enrollments/enrollment (RF-26) */
  createEnrollment(data: CreateEnrollmentRequest): Observable<EnrollmentResponseDto> {
    return this.http.post<EnrollmentResponseDto>(`${this.baseUrl}/enrollment`, data);
  }

  /** PATCH /enrollments/approve (RF-27/RF-28). `reason` es obligatorio si status = REJECTED. */
  updateEnrollmentStatus(enrollmentId: number, status: EnrollmentStatus, reason?: string): Observable<EnrollmentResponseDto> {
    return this.http.patch<EnrollmentResponseDto>(`${this.baseUrl}/approve`, { enrollmentId, status, reason });
  }

  /** GET /enrollments/category/{category} (RF-29) */
  getEnrollmentsByCategory(category: string): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.baseUrl}/category/${category}`);
  }

  /** GET /enrollments/my (RF-30) */
  getMyEnrollments(): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.baseUrl}/my`);
  }

  /** GET /enrollments/event/{eventId} */
  getEnrollmentsByEvent(eventId: number): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.baseUrl}/event/${eventId}`);
  }

  /**
   * El backend no expone un listado general de inscripciones: solo por evento
   * (organizador) o por categoría. Sin eventId no hay endpoint equivalente.
   */
  getEnrollments(eventId?: number): Observable<EnrollmentResponseDto[]> {
    if (eventId == null) {
      console.warn('EnrollmentService.getEnrollments: se requiere eventId, el backend no tiene un listado general.');
      return of([]);
    }
    return this.getEnrollmentsByEvent(eventId);
  }

  /** GET /enrollments/events/{eventId}/users/{userId}/role */
  getUserEventRole(eventId: number, userId: number): Observable<UserEventRoleResponseDto> {
    return this.http.get<UserEventRoleResponseDto>(`${this.baseUrl}/events/${eventId}/users/${userId}/role`);
  }
}
