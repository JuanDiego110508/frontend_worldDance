import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateStreamSessionRequest,
  FinishStreamRequest,
  HttpGlobalResponse,
  LiveStreamSummary,
  StreamAdminResponse,
  StreamPublicResponse,
  StreamStatus,
  ToggleStreamStateRequest,
  UpdateOverlayRequest,
  UpdateStreamConfigRequest
} from '../models/stream.model';

@Injectable({
  providedIn: 'root'
})
export class StreamService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/stream`;

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.message ?? 'No fue posible comunicarse con el servidor de streaming.';
    return throwError(() => new Error(message));
  }

  /**
   * El backend responde 200 con { data: "<url completa de autorización de Kick>" }.
   * No es una redirección HTTP: el frontend debe navegar manualmente a esa URL.
   */
  getKickLoginUrl(eventId: number): Observable<string> {
    return this.http.get<HttpGlobalResponse<string>>(`${this.apiUrl}/oauth/kick/login`, {
      params: { state: eventId.toString() }
    }).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  createStreamSession(data: CreateStreamSessionRequest): Observable<StreamAdminResponse> {
    return this.http.post<HttpGlobalResponse<StreamAdminResponse>>(`${this.apiUrl}/createStreamSession`, data).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  /** El backend acepta GET/POST/PATCH en esta ruta; se usa POST con body, el método recomendado por el propio controller. */
  toggleState(eventId: number, data: ToggleStreamStateRequest): Observable<StreamPublicResponse> {
    return this.http.post<HttpGlobalResponse<StreamPublicResponse>>(`${this.apiUrl}/toggleState/${eventId}`, data).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  /** Passthrough crudo de métricas (ffmpeg-manager); no tiene una forma fija garantizada. */
  getStatus(eventId: number): Observable<StreamStatus> {
    return this.http.get<HttpGlobalResponse<StreamStatus>>(`${this.apiUrl}/status/${eventId}`).pipe(
      map(res => res.data ?? {}),
      catchError(err => this.handleError(err))
    );
  }

  updateOverlay(eventId: number, data: UpdateOverlayRequest): Observable<StreamPublicResponse> {
    return this.http.put<HttpGlobalResponse<StreamPublicResponse>>(`${this.apiUrl}/updateOverlay/${eventId}`, data).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  /** Listado público (sin autenticación) de eventos actualmente en vivo, para la navbar. */
  getLiveStreams(): Observable<LiveStreamSummary[]> {
    return this.http.get<HttpGlobalResponse<LiveStreamSummary[]>>(`${this.apiUrl}/live`).pipe(
      map(res => res.data ?? []),
      catchError(err => this.handleError(err))
    );
  }

  getPublicEvent(eventId: number): Observable<StreamPublicResponse> {
    return this.http.get<HttpGlobalResponse<StreamPublicResponse>>(`${this.apiUrl}/event/${eventId}`).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  getAdminEvent(eventId: number): Observable<StreamAdminResponse> {
    return this.http.get<HttpGlobalResponse<StreamAdminResponse>>(`${this.apiUrl}/admin/event/${eventId}`).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  /** Edita el servidor RTMP/ingesta, la clave de retransmisión, el canal y el título/descripción de una sesión ya creada. */
  updateStreamConfig(eventId: number, data: UpdateStreamConfigRequest): Observable<StreamAdminResponse> {
    return this.http.put<HttpGlobalResponse<StreamAdminResponse>>(`${this.apiUrl}/config/${eventId}`, data).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * PATCH real (no POST). `streamId` es el `_id` de Mongo devuelto en `StreamAdminResponse.id`,
   * NO el eventId.
   */
  finishStream(streamId: string, data: FinishStreamRequest = {}): Observable<StreamPublicResponse> {
    return this.http.patch<HttpGlobalResponse<StreamPublicResponse>>(`${this.apiUrl}/finish/${streamId}`, data).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }
}
