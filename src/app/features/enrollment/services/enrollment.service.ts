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
  private readonly apiUrl = `${environment.apiUrl}/enrollment`;

  getEnrollments(eventId?: number): Observable<EnrollmentResponseDto[]> {
    const url = eventId ? `${this.apiUrl}?eventId=${eventId}` : this.apiUrl;
    return this.http.get<EnrollmentResponseDto[]>(url);
  }

  getMyEnrollments(): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.apiUrl}/my-enrollments`);
  }

  getEnrollmentById(id: number): Observable<EnrollmentResponseDto> {
    return this.http.get<EnrollmentResponseDto>(`${this.apiUrl}/${id}`);
  }

  createEnrollment(data: CreateEnrollmentRequest): Observable<EnrollmentResponseDto> {
    return this.http.post<EnrollmentResponseDto>(this.apiUrl, data);
  }

  getEnrollmentsByEvent(eventId: number): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.apiUrl}?eventId=${eventId}`);
  }

  getEnrollmentsByCategory(category: string): Observable<EnrollmentResponseDto[]> {
    return this.http.get<EnrollmentResponseDto[]>(`${this.apiUrl}?category=${category}`);
  }

  getUserEventRole(eventId: number, userId: number): Observable<{ roleInEvent: EventRole }> {
    return this.http.get<{ roleInEvent: EventRole }>(`${this.apiUrl}/role?eventId=${eventId}&userId=${userId}`);
  }

  updateEnrollmentStatus(id: number, status: EnrollmentStatus): Observable<EnrollmentResponseDto> {
    return this.http.patch<EnrollmentResponseDto>(`${this.apiUrl}/${id}/status`, { status });
  }
}
