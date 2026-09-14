import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardSummaryResponse } from '../models/reports.model';

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
}
