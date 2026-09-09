import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ModalityCategory } from '../../events/enums/event-enums';
import {
  ApproveEnrollmentRequestDto,
  EnrollmentRequestDto,
  EnrollmentResponseDto,
  UserEventRoleResponseDto
} from '../models/enrollment.interface';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/enrollments`;

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.message ?? 'No fue posible comunicarse con el servidor de inscripciones.';
    return throwError(() => new Error(message));
  }

  /** El usuario se identifica vía header X-User-Id, inyectado por el API Gateway a partir del JWT. */
  createEnrollment(data: EnrollmentRequestDto): Observable<EnrollmentResponseDto> {
    return this.http.post<EnrollmentResponseDto>(`${this.apiUrl}/enrollment`, data).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /** `reason` es obligatorio cuando status es REJECTED (lo valida el backend). */
  approveOrReject(data: ApproveEnrollmentRequestDto): Observable<EnrollmentResponseDto> {
    return this.http.patch<EnrollmentResponseDto>(`${this.apiUrl}/approve`, data).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /** El backend lista por categoría de danza, no por evento. */
  getEnrollmentsByCategory(category: ModalityCategory): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.apiUrl}/category/${category}`).pipe(
      catchError(err => this.handleError(err))
    );
  }

  getMyEnrollments(): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.apiUrl}/my`).pipe(
      catchError(err => this.handleError(err))
    );
  }

  getUserEventRole(eventId: number, userId: number): Observable<UserEventRoleResponseDto> {
    return this.http.get<UserEventRoleResponseDto>(`${this.apiUrl}/events/${eventId}/users/${userId}/role`).pipe(
      catchError(err => this.handleError(err))
    );
  }

  getEnrollmentById(id: number): Observable<EnrollmentResponseDto> {
    return this.http.get<EnrollmentResponseDto>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => this.handleError(err))
    );
  }
}
