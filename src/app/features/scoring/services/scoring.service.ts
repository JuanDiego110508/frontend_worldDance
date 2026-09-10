import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateEvaluationRequest,
  UpdateEvaluationRequest,
  EvaluationResponse,
  ResultResponse
} from '../models/scoring.model';

@Injectable({
  providedIn: 'root'
})
export class ScoringService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/scoring`;

  private readonly resultsSignal = signal<ResultResponse[]>([]);
  readonly results = this.resultsSignal.asReadonly();

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.message ?? 'No fue posible comunicarse con el servidor de scoring.';
    return throwError(() => new Error(message));
  }

  /**
   * HU44 – Registrar puntaje.
   * POST /scoring/events/{eventId}/modalities/{modalityId}/enrollments/{enrollmentId}/evaluations
   */
  registerEvaluation(
    eventId: string,
    modalityId: string,
    enrollmentId: string,
    request: CreateEvaluationRequest
  ): Observable<EvaluationResponse> {
    const url = `${this.baseUrl}/events/${eventId}/modalities/${modalityId}/enrollments/${enrollmentId}/evaluations`;
    return this.http.post<EvaluationResponse>(url, request).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /**
   * HU46 – Editar puntaje.
   * PUT /scoring/events/{eventId}/modalities/{modalityId}/evaluations/{evaluationId}
   */
  updateEvaluation(
    eventId: string,
    modalityId: string,
    evaluationId: string,
    request: UpdateEvaluationRequest
  ): Observable<EvaluationResponse> {
    const url = `${this.baseUrl}/events/${eventId}/modalities/${modalityId}/evaluations/${evaluationId}`;
    return this.http.put<EvaluationResponse>(url, request).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Consultar una evaluación.
   * GET /scoring/events/{eventId}/modalities/{modalityId}/evaluations/{evaluationId}
   */
  getEvaluation(
    eventId: string,
    modalityId: string,
    evaluationId: string
  ): Observable<EvaluationResponse> {
    const url = `${this.baseUrl}/events/${eventId}/modalities/${modalityId}/evaluations/${evaluationId}`;
    return this.http.get<EvaluationResponse>(url).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /**
   * HU51 – Consultar resultados del evento.
   * GET /scoring/events/{eventId}/modalities/{modalityId}/results
   */
  getResultsByModality(eventId: string, modalityId: string): Observable<ResultResponse[]> {
    const url = `${this.baseUrl}/events/${eventId}/modalities/${modalityId}/results`;
    return this.http.get<ResultResponse[]>(url).pipe(
      tap(results => this.resultsSignal.set(results)),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * HU47 – Cerrar sesión de evaluación.
   * PATCH /scoring/events/{eventId}/modalities/{modalityId}/session/close?organizerId=
   */
  closeSession(eventId: string, modalityId: string, organizerId: string): Observable<void> {
    const url = `${this.baseUrl}/events/${eventId}/modalities/${modalityId}/session/close`;
    return this.http.patch<void>(url, null, { params: { organizerId } }).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /**
   * HU50 – Publicar resultados.
   * PATCH /scoring/events/{eventId}/modalities/{modalityId}/session/publish?organizerId=
   */
  publishResults(eventId: string, modalityId: string, organizerId: string): Observable<void> {
    const url = `${this.baseUrl}/events/${eventId}/modalities/${modalityId}/session/publish`;
    return this.http.patch<void>(url, null, { params: { organizerId } }).pipe(
      catchError(err => this.handleError(err))
    );
  }
}
