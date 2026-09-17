import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { 
  ScheduleGenerationRequestDto, 
  ScheduleGenerationResponseDto, 
  ScheduleStatus 
} from '../models/scheduling.interface';
import { HttpGlobalResponse } from '../../events/models/event.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SchedulingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/scheduling`;

  generateSchedule(request: ScheduleGenerationRequestDto): Observable<ScheduleGenerationResponseDto> {
    return this.http.post<HttpGlobalResponse<ScheduleGenerationResponseDto>>(`${this.apiUrl}/generate`, request)
      .pipe(map(res => res.data!));
  }

  getScheduleByEvent(eventId: number): Observable<ScheduleGenerationResponseDto> {
    return this.http.get<HttpGlobalResponse<ScheduleGenerationResponseDto>>(`${this.apiUrl}/event/${eventId}`)
      .pipe(map(res => res.data!));
  }

  updateScheduleStatus(eventId: number, status: ScheduleStatus): Observable<ScheduleGenerationResponseDto> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<HttpGlobalResponse<ScheduleGenerationResponseDto>>(`${this.apiUrl}/event/${eventId}/status`, null, { params })
      .pipe(map(res => res.data!));
  }

  deleteSchedule(eventId: number): Observable<void> {
    return this.http.delete<HttpGlobalResponse<void>>(`${this.apiUrl}/event/${eventId}`)
      .pipe(map(() => void 0));
  }
}
