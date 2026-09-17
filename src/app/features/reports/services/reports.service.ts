import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DashboardSummaryResponse,
  EnrollmentReportFilter,
  EnrollmentReportResponse,
  EventSummaryReportResponse,
  ScheduleReportResponse
} from '../models/reports.model';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly http = inject(HttpClient);

  // API path using environment URL
  private readonly apiUrl = `${environment.apiUrl}/reports`;

  getDashboardSummary(): Observable<DashboardSummaryResponse> {
    return this.http.get<DashboardSummaryResponse>(`${this.apiUrl}/dashboard/summary`);
  }

  getEventSummary(eventId: number): Observable<EventSummaryReportResponse> {
    return this.http.get<EventSummaryReportResponse>(`${this.apiUrl}/events/${eventId}/summary`);
  }

  exportEventReportPdf(eventId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/events/${eventId}/export/pdf`, {
      responseType: 'blob'
    });
  }

  exportEventReportExcel(eventId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/events/${eventId}/export/excel`, {
      responseType: 'blob'
    });
  }

  getEnrollmentReport(eventId: number, filter: EnrollmentReportFilter): Observable<EnrollmentReportResponse> {
    return this.http.get<EnrollmentReportResponse>(`${this.apiUrl}/events/${eventId}/enrollments`, {
      params: { filter }
    });
  }

  exportEnrollmentPdf(eventId: number, filter: EnrollmentReportFilter): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/events/${eventId}/enrollments/export/pdf`, {
      params: { filter },
      responseType: 'blob'
    });
  }

  getScheduleAvailability(eventId: number): Observable<ScheduleReportResponse> {
    return this.http.get<ScheduleReportResponse>(`${this.apiUrl}/events/${eventId}/schedule`);
  }

  exportSchedulePdf(eventId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/events/${eventId}/schedule/export/pdf`, {
      responseType: 'blob'
    });
  }
}
