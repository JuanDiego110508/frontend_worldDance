import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HttpGlobalResponse, MusicTrackResponseDto } from '../models/music-track.model';

@Injectable({
  providedIn: 'root'
})
export class MusicTrackService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/music`;

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.message ?? 'No fue posible comunicarse con el servidor de música.';
    return throwError(() => new Error(message));
  }

  uploadTrack(enrollmentId: number, file: File): Observable<MusicTrackResponseDto> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<HttpGlobalResponse<MusicTrackResponseDto>>(`${this.apiUrl}/upload`, formData, {
      params: { enrollmentId: enrollmentId.toString() }
    }).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  /** Expone los eventos de progreso de la subida para alimentar una barra de progreso en el componente. */
  uploadTrackWithProgress(enrollmentId: number, file: File): Observable<HttpEvent<HttpGlobalResponse<MusicTrackResponseDto>>> {
    const formData = new FormData();
    formData.append('file', file);

    const request = new HttpRequest('POST', `${this.apiUrl}/upload`, formData, {
      params: new HttpParams().set('enrollmentId', enrollmentId.toString()),
      reportProgress: true
    });

    return this.http.request<HttpGlobalResponse<MusicTrackResponseDto>>(request).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /**
   * `null` significa que todavía no se ha subido ninguna pista para esta inscripción: el backend
   * responde 400 con el mensaje "No se encontraron metadatos para la inscripción: {id}" para este
   * caso, que no es un error real sino un estado válido de la UI.
   */
  getMetadata(enrollmentId: number): Observable<MusicTrackResponseDto | null> {
    return this.http.get<HttpGlobalResponse<MusicTrackResponseDto>>(`${this.apiUrl}/metadata/${enrollmentId}`).pipe(
      map(res => res.data),
      catchError(err => {
        const message = err?.error?.message ?? err?.message ?? '';
        if (typeof message === 'string' && message.includes('No se encontraron metadatos')) {
          return of(null);
        }
        return this.handleError(err);
      })
    );
  }

  downloadTrack(enrollmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download/${enrollmentId}`, { responseType: 'blob' }).pipe(
      catchError(err => this.handleError(err))
    );
  }
}
