import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ModalityRequestDto, ModalityResponseDto } from '../models/modality.model';
import { HttpGlobalResponse } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class ModalityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/modality`;

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.message ?? 'No fue posible comunicarse con el servidor de modalidades.';
    return throwError(() => new Error(message));
  }

  /** El backend responde 400 (no 200 con lista vacía) cuando el evento no tiene modalidades registradas. */
  getModalitiesByEventId(eventId: number): Observable<ModalityResponseDto[]> {
    return this.http.get<HttpGlobalResponse<ModalityResponseDto[]>>(`${this.apiUrl}/getModalitiesByEventId/${eventId}`).pipe(
      map(res => res.data ?? []),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 400) {
          return of([]);
        }
        return this.handleError(err);
      })
    );
  }

  createModality(eventId: number, modality: ModalityRequestDto): Observable<ModalityResponseDto> {
    return this.http.post<HttpGlobalResponse<ModalityResponseDto>>(`${this.apiUrl}/create/${eventId}`, modality).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  updateModality(modalityId: number, modality: ModalityRequestDto): Observable<ModalityResponseDto> {
    return this.http.patch<HttpGlobalResponse<ModalityResponseDto>>(`${this.apiUrl}/update/${modalityId}`, modality).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  deleteModality(modalityId: number): Observable<void> {
    return this.http.delete<HttpGlobalResponse<unknown>>(`${this.apiUrl}/delete/${modalityId}`).pipe(
      map(() => void 0),
      catchError(err => this.handleError(err))
    );
  }
}
